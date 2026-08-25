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

    /**
     * Active instance — set by Engine3D.activate() before each frame.
     * @internal
     */
    public static current: GPUContext;

    // ── instance state ────────────────────────────────────────────────────────

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

    // ── instance API ──────────────────────────────────────────────────────────

    public bindPipeline(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderShader: RenderShaderPass): boolean {
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

    public createPipeline(gpuRenderPipeline: GPURenderPipelineDescriptor): GPURenderPipeline {
        ProfilerUtil.countStart("GPUContext", "pipeline");
        return webGPUContext.device.createRenderPipeline(gpuRenderPipeline);
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
        return webGPUContext.device.createRenderBundleEncoder(des);
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
        encoder.insertDebugMarker("end");
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

    // ── static property shims (delegate to GPUContext.current fields) ─────────

    public static get lastGeometry(): GeometryBase { return GPUContext.current.lastGeometry; }
    public static set lastGeometry(v: GeometryBase) { GPUContext.current.lastGeometry = v; }

    public static get lastPipeline(): GPURenderPipeline { return GPUContext.current.lastPipeline; }
    public static set lastPipeline(v: GPURenderPipeline) { GPUContext.current.lastPipeline = v; }

    public static get lastShader(): RenderShaderPass { return GPUContext.current.lastShader; }
    public static set lastShader(v: RenderShaderPass) { GPUContext.current.lastShader = v; }

    public static get drawCount(): number { return GPUContext.current.drawCount; }
    public static set drawCount(v: number) { GPUContext.current.drawCount = v; }

    public static get renderPassCount(): number { return GPUContext.current.renderPassCount; }
    public static set renderPassCount(v: number) { GPUContext.current.renderPassCount = v; }

    public static get geometryCount(): number { return GPUContext.current.geometryCount; }
    public static set geometryCount(v: number) { GPUContext.current.geometryCount = v; }

    public static get pipelineCount(): number { return GPUContext.current.pipelineCount; }
    public static set pipelineCount(v: number) { GPUContext.current.pipelineCount = v; }

    public static get matrixCount(): number { return GPUContext.current.matrixCount; }
    public static set matrixCount(v: number) { GPUContext.current.matrixCount = v; }

    public static get lastRenderPassState(): RendererPassState { return GPUContext.current.lastRenderPassState; }
    public static set lastRenderPassState(v: RendererPassState) { GPUContext.current.lastRenderPassState = v; }

    public static get LastCommand(): GPUCommandEncoder { return GPUContext.current.LastCommand; }
    public static set LastCommand(v: GPUCommandEncoder) { GPUContext.current.LastCommand = v; }

    // ── static method shims (delegate to GPUContext.current) ──────────────────

    public static bindPipeline(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderShader: RenderShaderPass): boolean {
        return GPUContext.current.bindPipeline(encoder, renderShader);
    }

    public static bindCamera(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, camera: Camera3D) {
        GPUContext.current.bindCamera(encoder, camera);
    }

    public static bindGeometryBuffer(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, geometry: GeometryBase) {
        GPUContext.current.bindGeometryBuffer(encoder, geometry);
    }

    public static cleanCache() {
        GPUContext.current.cleanCache();
    }

    public static createPipeline(gpuRenderPipeline: GPURenderPipelineDescriptor): GPURenderPipeline {
        return GPUContext.current.createPipeline(gpuRenderPipeline);
    }

    public static beginCommandEncoder(): GPUCommandEncoder {
        return GPUContext.current.beginCommandEncoder();
    }

    public static endCommandEncoder(command: GPUCommandEncoder) {
        GPUContext.current.endCommandEncoder(command);
    }

    public static recordBundleEncoder(des: GPURenderBundleEncoderDescriptor): GPURenderBundleEncoder {
        return GPUContext.current.recordBundleEncoder(des);
    }

    public static beginRenderPass(command: GPUCommandEncoder, renderPassState: RendererPassState): GPURenderPassEncoder {
        return GPUContext.current.beginRenderPass(command, renderPassState);
    }

    public static drawIndexed(encoder: GPURenderPassEncoder, indexCount: GPUSize32,
        instanceCount?: GPUSize32,
        firstIndex?: GPUSize32,
        baseVertex?: GPUSignedOffset32,
        firstInstance?: GPUSize32) {
        GPUContext.current.drawIndexed(encoder, indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
    }

    public static draw(encoder: GPURenderPassEncoder, vertexCount: GPUSize32,
        instanceCount?: GPUSize32,
        firstVertex?: GPUSize32,
        firstInstance?: GPUSize32) {
        GPUContext.current.draw(encoder, vertexCount, instanceCount, firstVertex, firstInstance);
    }

    public static endPass(encoder: GPURenderPassEncoder) {
        GPUContext.current.endPass(encoder);
    }

    public static computeCommand(command: GPUCommandEncoder, computes: ComputeShader[]) {
        GPUContext.current.computeCommand(command, computes);
    }

    public static copyTexture(command: GPUCommandEncoder, source: Texture, dest: Texture) {
        GPUContext.current.copyTexture(command, source, dest);
    }
}
