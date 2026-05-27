import { Camera3D } from "../../core/Camera3D";
import { GeometryBase } from "../../core/geometry/GeometryBase";
import { ProfilerUtil } from "../../util/ProfilerUtil";
import { webGPUContext } from "../graphics/webGpu/Context3D";
import { GlobalBindGroup } from "../graphics/webGpu/core/bindGroups/GlobalBindGroup";
import { Texture } from "../graphics/webGpu/core/texture/Texture";
import { ComputeShader } from "../graphics/webGpu/shader/ComputeShader";
import { RenderShaderPass } from "../graphics/webGpu/shader/RenderShaderPass";
import { RendererPassState } from "./passRenderer/state/RendererPassState";

let _current: GPUContext | null = null;

/**
 * @internal
 * Activate a GPUContext instance as the current one. Called by Engine3D.
 */
export function _setCurrentGPUContext(ctx: GPUContext | null): void {
    _current = ctx;
}

/**
 * Per-engine WebGPU rendering state.
 * Static methods delegate to the currently active engine instance.
 * @group GFX
 */
export class GPUContext {

    // ── Per-engine instance state ─────────────────────────────────────────────
    public lastGeometry: GeometryBase | null = null;
    public lastPipeline: GPURenderPipeline | null = null;
    public lastShader: RenderShaderPass | null = null;
    public drawCount: number = 0;
    public renderPassCount: number = 0;
    public geometryCount: number = 0;
    public pipelineCount: number = 0;
    public matrixCount: number = 0;
    public lastRenderPassState: RendererPassState | null = null;
    public LastCommand: GPUCommandEncoder | null = null;

    // ── Static getters/setters (delegate to current engine instance) ──────────

    public static get lastGeometry(): GeometryBase { return _current!.lastGeometry; }
    public static set lastGeometry(v: GeometryBase) { _current!.lastGeometry = v; }

    public static get lastPipeline(): GPURenderPipeline { return _current!.lastPipeline; }
    public static set lastPipeline(v: GPURenderPipeline) { _current!.lastPipeline = v; }

    public static get lastShader(): RenderShaderPass { return _current!.lastShader; }
    public static set lastShader(v: RenderShaderPass) { _current!.lastShader = v; }

    public static get drawCount(): number { return _current!.drawCount; }
    public static set drawCount(v: number) { _current!.drawCount = v; }

    public static get renderPassCount(): number { return _current!.renderPassCount; }
    public static set renderPassCount(v: number) { _current!.renderPassCount = v; }

    public static get geometryCount(): number { return _current!.geometryCount; }
    public static set geometryCount(v: number) { _current!.geometryCount = v; }

    public static get pipelineCount(): number { return _current!.pipelineCount; }
    public static set pipelineCount(v: number) { _current!.pipelineCount = v; }

    public static get matrixCount(): number { return _current!.matrixCount; }
    public static set matrixCount(v: number) { _current!.matrixCount = v; }

    public static get lastRenderPassState(): RendererPassState { return _current!.lastRenderPassState; }
    public static set lastRenderPassState(v: RendererPassState) { _current!.lastRenderPassState = v; }

    public static get LastCommand(): GPUCommandEncoder { return _current!.LastCommand; }
    public static set LastCommand(v: GPUCommandEncoder) { _current!.LastCommand = v; }

    // ── Static methods (unchanged — they access state via the getters above) ──

    /**
     * renderPipeline before render need bind pipeline
     */
    public static bindPipeline(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderShader: RenderShaderPass) {
        if (GPUContext.lastShader != renderShader) {
            GPUContext.lastShader = renderShader;
        } else {
            return false;
        }

        if (GPUContext.lastPipeline != renderShader.pipeline) {
            GPUContext.lastPipeline = renderShader.pipeline;
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

    /**
     * render before need make sure use camera
     */
    public static bindCamera(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, camera: Camera3D) {
        let cameraBindGroup = GlobalBindGroup.getCameraGroup(camera);
        encoder.setBindGroup(0, cameraBindGroup.globalBindGroup);
    }

    /**
     * bind geometry vertex buffer to current render pipeline
     */
    public static bindGeometryBuffer(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, geometry: GeometryBase) {
        if (GPUContext.lastGeometry != geometry) {
            GPUContext.lastGeometry = geometry;

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

    /**
     * begin or end clean all use cache
     */
    public static cleanCache() {
        GPUContext.lastGeometry = null;
        GPUContext.lastPipeline = null;
        GPUContext.lastShader = null;
    }

    /**
     * create a render pipeline
     */
    public static createPipeline(gpuRenderPipeline: GPURenderPipelineDescriptor) {
        ProfilerUtil.countStart("GPUContext", "pipeline");
        let pipeline: GPURenderPipeline = webGPUContext.device.createRenderPipeline(gpuRenderPipeline);
        return pipeline;
    }

    /**
     * auto get webgpu commandEncoder and start a command encoder
     */
    public static beginCommandEncoder(): GPUCommandEncoder {
        ProfilerUtil.countStart("GPUContext", "beginCommandEncoder");
        if (GPUContext.LastCommand) {
            webGPUContext.device.queue.submit([GPUContext.LastCommand.finish()]);
        }
        GPUContext.LastCommand = webGPUContext.device.createCommandEncoder();
        return GPUContext.LastCommand;
    }

    /**
     * end CommandEncoder record and submit
     */
    public static endCommandEncoder(command: GPUCommandEncoder) {
        if (GPUContext.LastCommand == command) {
            webGPUContext.device.queue.submit([GPUContext.LastCommand.finish()]);
            GPUContext.LastCommand = null;
            ProfilerUtil.countStart("GPUContext", "endCommandEncoder");
        }
    }

    /**
     * create a renderBundle gpu object by GPURenderBundleEncoderDescriptor
     */
    public static recordBundleEncoder(des: GPURenderBundleEncoderDescriptor): GPURenderBundleEncoder {
        let bundleEncoder: GPURenderBundleEncoder = webGPUContext.device.createRenderBundleEncoder(des);
        return bundleEncoder;
    }

    /**
     * render pass start return current use gpu renderPassEncoder
     */
    public static beginRenderPass(command: GPUCommandEncoder, renderPassState: RendererPassState): GPURenderPassEncoder {
        GPUContext.cleanCache();
        GPUContext.renderPassCount++;
        GPUContext.lastRenderPassState = renderPassState;
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

    public static drawIndexed(encoder: GPURenderPassEncoder, indexCount: GPUSize32,
        instanceCount?: GPUSize32,
        firstIndex?: GPUSize32,
        baseVertex?: GPUSignedOffset32,
        firstInstance?: GPUSize32) {
        encoder.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
        GPUContext.drawCount++;
    }

    public static draw(encoder: GPURenderPassEncoder, vertexCount: GPUSize32,
        instanceCount?: GPUSize32,
        firstVertex?: GPUSize32,
        firstInstance?: GPUSize32) {
        encoder.draw(vertexCount, instanceCount, firstVertex, firstInstance);
        GPUContext.drawCount++;
    }

    /**
     * The GPU must be informed of the end of encoder recording
     */
    public static endPass(encoder: GPURenderPassEncoder) {
        encoder.insertDebugMarker("end");
        encoder.end();
    }

    /**
     * Perform the final calculation and submit the Shader to the GPU
     */
    public static computeCommand(command: GPUCommandEncoder, computes: ComputeShader[]) {
        let computePass = command.beginComputePass();
        for (let i = 0; i < computes.length; i++) {
            const compute = computes[i];
            compute.compute(computePass);
        }
        computePass.end();
    }

    public static copyTexture(command: GPUCommandEncoder, source: Texture, dest: Texture) {
        command.copyTextureToTexture(
            { texture: source.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { texture: dest.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { width: dest.width, height: dest.height, depthOrArrayLayers: 1 },
        );
    }
}
