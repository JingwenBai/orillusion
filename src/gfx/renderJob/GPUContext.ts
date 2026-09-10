import { Camera3D } from "../../core/Camera3D";
import { GeometryBase } from "../../core/geometry/GeometryBase";
import { ProfilerUtil } from "../../util/ProfilerUtil";
import { webGPUContext } from "../graphics/webGpu/Context3D";
import { GlobalBindGroup } from "../graphics/webGpu/core/bindGroups/GlobalBindGroup";
import { Texture } from "../graphics/webGpu/core/texture/Texture";
import { ComputeShader } from "../graphics/webGpu/shader/ComputeShader";
import { RenderShaderPass } from "../graphics/webGpu/shader/RenderShaderPass";
import { RendererPassState } from "./passRenderer/state/RendererPassState";

/**
 * WebGPU api use context
 */
export class GPUContext {

    private static _current: GPUContext;

    /**
     * @internal
     * Set the active GPUContext instance used by the currently rendering engine.
     */
    public static setCurrentInstance(instance: GPUContext) {
        this._current = instance;
    }

    // --------------- Static proxy members/methods ---------------

    public static get lastGeometry(): GeometryBase { return this._current?.lastGeometry; }
    public static set lastGeometry(v: GeometryBase) { if (this._current) this._current.lastGeometry = v; }

    public static get lastPipeline(): GPURenderPipeline { return this._current?.lastPipeline; }
    public static set lastPipeline(v: GPURenderPipeline) { if (this._current) this._current.lastPipeline = v; }

    public static get lastShader(): RenderShaderPass { return this._current?.lastShader; }
    public static set lastShader(v: RenderShaderPass) { if (this._current) this._current.lastShader = v; }

    public static get drawCount(): number { return this._current?.drawCount ?? 0; }
    public static set drawCount(v: number) { if (this._current) this._current.drawCount = v; }

    public static get renderPassCount(): number { return this._current?.renderPassCount ?? 0; }
    public static set renderPassCount(v: number) { if (this._current) this._current.renderPassCount = v; }

    public static get geometryCount(): number { return this._current?.geometryCount ?? 0; }
    public static set geometryCount(v: number) { if (this._current) this._current.geometryCount = v; }

    public static get pipelineCount(): number { return this._current?.pipelineCount ?? 0; }
    public static set pipelineCount(v: number) { if (this._current) this._current.pipelineCount = v; }

    public static get matrixCount(): number { return this._current?.matrixCount ?? 0; }
    public static set matrixCount(v: number) { if (this._current) this._current.matrixCount = v; }

    public static get lastRenderPassState(): RendererPassState { return this._current?.lastRenderPassState; }
    public static set lastRenderPassState(v: RendererPassState) { if (this._current) this._current.lastRenderPassState = v; }

    public static get LastCommand(): GPUCommandEncoder { return this._current?.LastCommand; }
    public static set LastCommand(v: GPUCommandEncoder) { if (this._current) this._current.LastCommand = v; }

    public static bindPipeline(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderShader: RenderShaderPass) {
        return this._current?.bindPipeline(encoder, renderShader);
    }

    public static bindCamera(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, camera: Camera3D) {
        return this._current?.bindCamera(encoder, camera);
    }

    public static bindGeometryBuffer(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, geometry: GeometryBase) {
        return this._current?.bindGeometryBuffer(encoder, geometry);
    }

    public static cleanCache() {
        this._current?.cleanCache();
    }

    public static createPipeline(gpuRenderPipeline: GPURenderPipelineDescriptor) {
        return this._current?.createPipeline(gpuRenderPipeline);
    }

    public static beginCommandEncoder(): GPUCommandEncoder {
        return this._current?.beginCommandEncoder();
    }

    public static endCommandEncoder(command: GPUCommandEncoder) {
        this._current?.endCommandEncoder(command);
    }

    public static recordBundleEncoder(des: GPURenderBundleEncoderDescriptor): GPURenderBundleEncoder {
        return this._current?.recordBundleEncoder(des);
    }

    public static beginRenderPass(command: GPUCommandEncoder, renderPassState: RendererPassState): GPURenderPassEncoder {
        return this._current?.beginRenderPass(command, renderPassState);
    }

    public static drawIndexed(encoder: GPURenderPassEncoder, indexCount: GPUSize32,
        instanceCount?: GPUSize32,
        firstIndex?: GPUSize32,
        baseVertex?: GPUSignedOffset32,
        firstInstance?: GPUSize32) {
        this._current?.drawIndexed(encoder, indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
    }

    public static draw(encoder: GPURenderPassEncoder, vertexCount: GPUSize32,
        instanceCount?: GPUSize32,
        firstVertex?: GPUSize32,
        firstInstance?: GPUSize32) {
        this._current?.draw(encoder, vertexCount, instanceCount, firstVertex, firstInstance);
    }

    public static endPass(encoder: GPURenderPassEncoder) {
        this._current?.endPass(encoder);
    }

    public static computeCommand(command: GPUCommandEncoder, computes: ComputeShader[]) {
        this._current?.computeCommand(command, computes);
    }

    public static copyTexture(command: GPUCommandEncoder, source: Texture, dest: Texture) {
        this._current?.copyTexture(command, source, dest);
    }

    // --------------- Instance members ---------------

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
}
