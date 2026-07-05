import { Camera3D } from "../../core/Camera3D";
import { GeometryBase } from "../../core/geometry/GeometryBase";
import { ProfilerUtil } from "../../util/ProfilerUtil";
import { activeEngine } from "../../core/EngineContext";
import { webGPUContext } from "../graphics/webGpu/Context3D";
import { GlobalBindGroup } from "../graphics/webGpu/core/bindGroups/GlobalBindGroup";
import { Texture } from "../graphics/webGpu/core/texture/Texture";
import { ComputeShader } from "../graphics/webGpu/shader/ComputeShader";
import { RenderShaderPass } from "../graphics/webGpu/shader/RenderShaderPass";
import { RendererPassState } from "./passRenderer/state/RendererPassState";

/**
 * Per-engine render state cache.  Avoids redundant GPU state-setting calls
 * within a single render pass.
 * @internal
 */
export class GPUContextState {
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
}

/**
 * WebGPU api use context.
 * Static methods route to the currently-active engine's GPUContextState.
 * @group GFX
 */
export class GPUContext {

    // ── Static router methods (backward compatibility) ───────────────────

    public static get lastGeometry(): GeometryBase { return activeEngine?.gpuContextState?.lastGeometry; }
    public static set lastGeometry(v: GeometryBase) { if (activeEngine?.gpuContextState) activeEngine.gpuContextState.lastGeometry = v; }

    public static get lastPipeline(): GPURenderPipeline { return activeEngine?.gpuContextState?.lastPipeline; }
    public static set lastPipeline(v: GPURenderPipeline) { if (activeEngine?.gpuContextState) activeEngine.gpuContextState.lastPipeline = v; }

    public static get lastShader(): RenderShaderPass { return activeEngine?.gpuContextState?.lastShader; }
    public static set lastShader(v: RenderShaderPass) { if (activeEngine?.gpuContextState) activeEngine.gpuContextState.lastShader = v; }

    public static get drawCount(): number { return activeEngine?.gpuContextState?.drawCount ?? 0; }
    public static set drawCount(v: number) { if (activeEngine?.gpuContextState) activeEngine.gpuContextState.drawCount = v; }

    public static get renderPassCount(): number { return activeEngine?.gpuContextState?.renderPassCount ?? 0; }
    public static set renderPassCount(v: number) { if (activeEngine?.gpuContextState) activeEngine.gpuContextState.renderPassCount = v; }

    public static get geometryCount(): number { return activeEngine?.gpuContextState?.geometryCount ?? 0; }
    public static set geometryCount(v: number) { if (activeEngine?.gpuContextState) activeEngine.gpuContextState.geometryCount = v; }

    public static get pipelineCount(): number { return activeEngine?.gpuContextState?.pipelineCount ?? 0; }
    public static set pipelineCount(v: number) { if (activeEngine?.gpuContextState) activeEngine.gpuContextState.pipelineCount = v; }

    public static get matrixCount(): number { return activeEngine?.gpuContextState?.matrixCount ?? 0; }
    public static set matrixCount(v: number) { if (activeEngine?.gpuContextState) activeEngine.gpuContextState.matrixCount = v; }

    public static get lastRenderPassState(): RendererPassState { return activeEngine?.gpuContextState?.lastRenderPassState; }
    public static set lastRenderPassState(v: RendererPassState) { if (activeEngine?.gpuContextState) activeEngine.gpuContextState.lastRenderPassState = v; }

    public static get LastCommand(): GPUCommandEncoder { return activeEngine?.gpuContextState?.LastCommand; }
    public static set LastCommand(v: GPUCommandEncoder) { if (activeEngine?.gpuContextState) activeEngine.gpuContextState.LastCommand = v; }

    /**
     * Bind render pipeline and per-material bind groups.
     */
    public static bindPipeline(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderShader: RenderShaderPass) {
        const state = activeEngine?.gpuContextState;
        if (!state) return false;

        if (state.lastShader != renderShader) {
            state.lastShader = renderShader;
        } else {
            return false;
        }

        if (state.lastPipeline != renderShader.pipeline) {
            state.lastPipeline = renderShader.pipeline;
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
     * Bind camera uniform group.
     */
    public static bindCamera(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, camera: Camera3D) {
        let cameraBindGroup = GlobalBindGroup.getCameraGroup(camera);
        encoder.setBindGroup(0, cameraBindGroup.globalBindGroup);
    }

    /**
     * Bind geometry vertex/index buffers.
     */
    public static bindGeometryBuffer(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, geometry: GeometryBase) {
        const state = activeEngine?.gpuContextState;
        if (!state) return;

        if (state.lastGeometry != geometry) {
            state.lastGeometry = geometry;

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
     * Reset per-pass render state cache.
     */
    public static cleanCache() {
        const state = activeEngine?.gpuContextState;
        if (!state) return;
        state.lastGeometry = null;
        state.lastPipeline = null;
        state.lastShader = null;
    }

    /**
     * Create a GPU render pipeline.
     */
    public static createPipeline(gpuRenderPipeline: GPURenderPipelineDescriptor): GPURenderPipeline {
        ProfilerUtil.countStart("GPUContext", "pipeline");
        return webGPUContext.device.createRenderPipeline(gpuRenderPipeline);
    }

    /**
     * Begin a command encoder, auto-submitting any pending one.
     */
    public static beginCommandEncoder(): GPUCommandEncoder {
        ProfilerUtil.countStart("GPUContext", "beginCommandEncoder");
        const state = activeEngine?.gpuContextState;
        if (state?.LastCommand) {
            webGPUContext.device.queue.submit([state.LastCommand.finish()]);
        }
        const cmd = webGPUContext.device.createCommandEncoder();
        if (state) state.LastCommand = cmd;
        return cmd;
    }

    /**
     * Submit the command encoder.
     */
    public static endCommandEncoder(command: GPUCommandEncoder) {
        const state = activeEngine?.gpuContextState;
        if (state?.LastCommand == command) {
            webGPUContext.device.queue.submit([state.LastCommand.finish()]);
            state.LastCommand = null;
            ProfilerUtil.countStart("GPUContext", "endCommandEncoder");
        }
    }

    /**
     * Create a render bundle encoder.
     */
    public static recordBundleEncoder(des: GPURenderBundleEncoderDescriptor): GPURenderBundleEncoder {
        return webGPUContext.device.createRenderBundleEncoder(des);
    }

    /**
     * Begin a render pass, wiring up canvas / render-texture attachments.
     */
    public static beginRenderPass(command: GPUCommandEncoder, renderPassState: RendererPassState): GPURenderPassEncoder {
        this.cleanCache();
        const state = activeEngine?.gpuContextState;
        if (state) {
            state.renderPassCount++;
            state.lastRenderPassState = renderPassState;
        }
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
        const state = activeEngine?.gpuContextState;
        if (state) state.drawCount++;
    }

    public static draw(encoder: GPURenderPassEncoder, vertexCount: GPUSize32,
        instanceCount?: GPUSize32,
        firstVertex?: GPUSize32,
        firstInstance?: GPUSize32) {
        encoder.draw(vertexCount, instanceCount, firstVertex, firstInstance);
        const state = activeEngine?.gpuContextState;
        if (state) state.drawCount++;
    }

    public static endPass(encoder: GPURenderPassEncoder) {
        encoder.insertDebugMarker("end")
        encoder.end();
    }

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
