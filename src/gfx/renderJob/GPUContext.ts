import { Camera3D } from "../../core/Camera3D";
import { GeometryBase } from "../../core/geometry/GeometryBase";
import { ProfilerUtil } from "../../util/ProfilerUtil";
import { webGPUContext } from "../graphics/webGpu/Context3D";
import { GlobalBindGroup } from "../graphics/webGpu/core/bindGroups/GlobalBindGroup";
import { Texture } from "../graphics/webGpu/core/texture/Texture";
import { ComputeShader } from "../graphics/webGpu/shader/ComputeShader";
import { RenderShaderPass } from "../graphics/webGpu/shader/RenderShaderPass";
import { RendererPassState } from "./passRenderer/state/RendererPassState";

let _activeInstance: GPUContext = null;

/**
 * WebGPU api use context
 */
export class GPUContext {
    public lastGeometry: GeometryBase;
    public lastPipeline: GPURenderPipeline;
    public lastShader: RenderShaderPass;
    public drawCount: number = 0;
    public renderPassCount: number = 0;
    public geometryCount: number = 0;
    public pipelineCount: number = 0;
    public matrixCount: number = 0;
    public lastRenderPassState: RendererPassState;
    public LastCommand: GPUCommandEncoder;

    public bindPipeline(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderShader: RenderShaderPass) {
        if (this.lastShader != renderShader) {
            this.lastShader = renderShader;
        } else {
            return false;
        }

        if (this.lastPipeline != renderShader.pipeline) {
            this.lastPipeline = renderShader.pipeline;
            encoder.setPipeline(renderShader.pipeline);
        }

        for (let i = 1; i < renderShader.bindGroups.length; i++) {
            const bindGroup = renderShader.bindGroups[i];
            if (bindGroup) {
                encoder.setBindGroup(i, bindGroup);
            }
        }
        return true;
    }

    public bindCamera(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, camera: Camera3D) {
        let cameraBindGroup = GlobalBindGroup.getCameraGroup(camera);
        encoder.setBindGroup(0, cameraBindGroup.globalBindGroup);
    }

    public bindGeometryBuffer(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, geometry: GeometryBase) {
        if (this.lastGeometry != geometry) {
            this.lastGeometry = geometry;

            if (geometry.indicesBuffer)
                encoder.setIndexBuffer(geometry.indicesBuffer.indicesGPUBuffer.buffer, geometry.indicesBuffer.indicesFormat);

            let vertexBuffer = geometry.vertexBuffer.vertexGPUBuffer;
            let vertexBufferLayouts = geometry.vertexBuffer.vertexBufferLayouts;
            for (let i = 0; i < vertexBufferLayouts.length; i++) {
                const vbLayout = vertexBufferLayouts[i];
                encoder.setVertexBuffer(i, vertexBuffer.buffer, vbLayout.offset, vbLayout.size);
            }
        }
    }

    public cleanCache() {
        this.lastGeometry = null;
        this.lastPipeline = null;
        this.lastShader = null;
    }

    public createPipeline(gpuRenderPipeline: GPURenderPipelineDescriptor) {
        ProfilerUtil.countStart("GPUContext", "pipeline");
        let pipeline: GPURenderPipeline = webGPUContext.device.createRenderPipeline(gpuRenderPipeline);
        return pipeline;
    }

    public beginCommandEncoder(): GPUCommandEncoder {
        ProfilerUtil.countStart("GPUContext", "beginCommandEncoder");
        if (this.LastCommand) {
            webGPUContext.device.queue.submit([this.LastCommand.finish()]);
        }
        this.LastCommand = webGPUContext.device.createCommandEncoder();
        return this.LastCommand;
    }

    public endCommandEncoder(command: GPUCommandEncoder) {
        if (this.LastCommand == command) {
            webGPUContext.device.queue.submit([this.LastCommand.finish()]);
            this.LastCommand = null;
            ProfilerUtil.countStart("GPUContext", "endCommandEncoder");
        }
    }

    public recordBundleEncoder(des: GPURenderBundleEncoderDescriptor): GPURenderBundleEncoder {
        let bundleEncoder: GPURenderBundleEncoder = webGPUContext.device.createRenderBundleEncoder(des);
        return bundleEncoder;
    }

    public beginRenderPass(command: GPUCommandEncoder, renderPassState: RendererPassState): GPURenderPassEncoder {
        this.cleanCache();
        this.renderPassCount++;
        this.lastRenderPassState = renderPassState;
        if (renderPassState.depthTexture) {
            let depth = renderPassState.renderPassDescriptor.depthStencilAttachment;
            depth.view = renderPassState.depthTexture.getGPUView() as any;
        }
        if (renderPassState.renderTargets && renderPassState.renderTargets.length > 0) {
            for (let i = 0; i < renderPassState.renderTargets.length; ++i) {
                const renderTarget = renderPassState.renderTargets[i];
                let att = renderPassState.renderPassDescriptor.colorAttachments[i];
                if (renderPassState.multisample > 0 && renderPassState.renderTargets.length == 1) {
                    att.view = renderPassState.multiTexture.createView();
                    att.resolveTarget = renderTarget.getGPUView();
                } else {
                    att.view = renderTarget.getGPUTexture().createView();
                }
            }
            return command.beginRenderPass(renderPassState.renderPassDescriptor);
        } else {
            let att0 = renderPassState.renderPassDescriptor.colorAttachments[0];
            if (att0) {
                if (renderPassState.multisample > 0) {
                    att0.view = renderPassState.multiTexture.createView();
                    att0.resolveTarget = webGPUContext.context.getCurrentTexture().createView();
                } else {
                    att0.view = webGPUContext.context.getCurrentTexture().createView();
                }
            }
            return command.beginRenderPass(renderPassState.renderPassDescriptor);
        }
    }

    public drawIndexed(encoder: GPURenderPassEncoder, indexCount: GPUSize32,
        instanceCount?: GPUSize32,
        firstIndex?: GPUSize32,
        baseVertex?: GPUSignedOffset32,
        firstInstance?: GPUSize32) {
        encoder.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
        this.drawCount++;
    }

    public draw(encoder: GPURenderPassEncoder, vertexCount: GPUSize32,
        instanceCount?: GPUSize32,
        firstVertex?: GPUSize32,
        firstInstance?: GPUSize32) {
        encoder.draw(vertexCount, instanceCount, firstVertex, firstInstance);
        this.drawCount++;
    }

    public endPass(encoder: GPURenderPassEncoder) {
        encoder.insertDebugMarker("end")
        encoder.end();
    }

    public computeCommand(command: GPUCommandEncoder, computes: ComputeShader[]) {
        let computePass = command.beginComputePass();
        for (let i = 0; i < computes.length; i++) {
            const compute = computes[i];
            compute.compute(computePass);
        }
        computePass.end();
    }

    public copyTexture(command: GPUCommandEncoder, source: Texture, dest: Texture) {
        command.copyTextureToTexture(
            {
                texture: source.getGPUTexture(),
                mipLevel: 0,
                origin: { x: 0, y: 0, z: 0 },
            },
            {
                texture: dest.getGPUTexture(),
                mipLevel: 0,
                origin: { x: 0, y: 0, z: 0 },
            },
            {
                width: dest.width,
                height: dest.height,
                depthOrArrayLayers: 1,
            },
        );
    }

    // ---- Static delegation to active instance ----

    public static setActive(instance: GPUContext) {
        _activeInstance = instance;
    }

    public static get active(): GPUContext {
        return _activeInstance;
    }

    public static get lastGeometry(): GeometryBase { return _activeInstance?.lastGeometry; }
    public static set lastGeometry(v: GeometryBase) { if (_activeInstance) _activeInstance.lastGeometry = v; }
    public static get lastPipeline(): GPURenderPipeline { return _activeInstance?.lastPipeline; }
    public static set lastPipeline(v: GPURenderPipeline) { if (_activeInstance) _activeInstance.lastPipeline = v; }
    public static get lastShader(): RenderShaderPass { return _activeInstance?.lastShader; }
    public static set lastShader(v: RenderShaderPass) { if (_activeInstance) _activeInstance.lastShader = v; }
    public static get drawCount(): number { return _activeInstance?.drawCount ?? 0; }
    public static set drawCount(v: number) { if (_activeInstance) _activeInstance.drawCount = v; }
    public static get renderPassCount(): number { return _activeInstance?.renderPassCount ?? 0; }
    public static set renderPassCount(v: number) { if (_activeInstance) _activeInstance.renderPassCount = v; }
    public static get geometryCount(): number { return _activeInstance?.geometryCount ?? 0; }
    public static set geometryCount(v: number) { if (_activeInstance) _activeInstance.geometryCount = v; }
    public static get pipelineCount(): number { return _activeInstance?.pipelineCount ?? 0; }
    public static set pipelineCount(v: number) { if (_activeInstance) _activeInstance.pipelineCount = v; }
    public static get matrixCount(): number { return _activeInstance?.matrixCount ?? 0; }
    public static set matrixCount(v: number) { if (_activeInstance) _activeInstance.matrixCount = v; }
    public static get lastRenderPassState(): RendererPassState { return _activeInstance?.lastRenderPassState; }
    public static set lastRenderPassState(v: RendererPassState) { if (_activeInstance) _activeInstance.lastRenderPassState = v; }
    public static get LastCommand(): GPUCommandEncoder { return _activeInstance?.LastCommand; }
    public static set LastCommand(v: GPUCommandEncoder) { if (_activeInstance) _activeInstance.LastCommand = v; }

    /** @deprecated use instance method via engine.gpuContext */
    public static bindPipeline(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderShader: RenderShaderPass) {
        return _activeInstance?.bindPipeline(encoder, renderShader);
    }

    /** @deprecated use instance method via engine.gpuContext */
    public static bindCamera(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, camera: Camera3D) {
        _activeInstance?.bindCamera(encoder, camera);
    }

    /** @deprecated use instance method via engine.gpuContext */
    public static bindGeometryBuffer(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, geometry: GeometryBase) {
        _activeInstance?.bindGeometryBuffer(encoder, geometry);
    }

    /** @deprecated use instance method via engine.gpuContext */
    public static cleanCache() { _activeInstance?.cleanCache(); }

    /** @deprecated use instance method via engine.gpuContext */
    public static createPipeline(gpuRenderPipeline: GPURenderPipelineDescriptor) {
        return _activeInstance?.createPipeline(gpuRenderPipeline);
    }

    /** @deprecated use instance method via engine.gpuContext */
    public static beginCommandEncoder(): GPUCommandEncoder {
        return _activeInstance?.beginCommandEncoder();
    }

    /** @deprecated use instance method via engine.gpuContext */
    public static endCommandEncoder(command: GPUCommandEncoder) {
        _activeInstance?.endCommandEncoder(command);
    }

    /** @deprecated use instance method via engine.gpuContext */
    public static recordBundleEncoder(des: GPURenderBundleEncoderDescriptor): GPURenderBundleEncoder {
        return _activeInstance?.recordBundleEncoder(des);
    }

    /** @deprecated use instance method via engine.gpuContext */
    public static beginRenderPass(command: GPUCommandEncoder, renderPassState: RendererPassState): GPURenderPassEncoder {
        return _activeInstance?.beginRenderPass(command, renderPassState);
    }

    /** @deprecated use instance method via engine.gpuContext */
    public static drawIndexed(encoder: GPURenderPassEncoder, indexCount: GPUSize32,
        instanceCount?: GPUSize32, firstIndex?: GPUSize32,
        baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32) {
        _activeInstance?.drawIndexed(encoder, indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
    }

    /** @deprecated use instance method via engine.gpuContext */
    public static draw(encoder: GPURenderPassEncoder, vertexCount: GPUSize32,
        instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32) {
        _activeInstance?.draw(encoder, vertexCount, instanceCount, firstVertex, firstInstance);
    }

    /** @deprecated use instance method via engine.gpuContext */
    public static endPass(encoder: GPURenderPassEncoder) { _activeInstance?.endPass(encoder); }

    /** @deprecated use instance method via engine.gpuContext */
    public static computeCommand(command: GPUCommandEncoder, computes: ComputeShader[]) {
        _activeInstance?.computeCommand(command, computes);
    }

    /** @deprecated use instance method via engine.gpuContext */
    public static copyTexture(command: GPUCommandEncoder, source: Texture, dest: Texture) {
        _activeInstance?.copyTexture(command, source, dest);
    }
}
