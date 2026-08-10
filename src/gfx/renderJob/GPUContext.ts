import { Camera3D } from "../../core/Camera3D";
import { GeometryBase } from "../../core/geometry/GeometryBase";
import { ProfilerUtil } from "../../util/ProfilerUtil";
import { webGPUContext } from "../graphics/webGpu/Context3D";
import { GlobalBindGroup } from "../graphics/webGpu/core/bindGroups/GlobalBindGroup";
import { Texture } from "../graphics/webGpu/core/texture/Texture";
import { ComputeShader } from "../graphics/webGpu/shader/ComputeShader";
import { RenderShaderPass } from "../graphics/webGpu/shader/RenderShaderPass";
import { RendererPassState } from "./passRenderer/state/RendererPassState";
import { getActiveEngine } from "../../_activeEngine";

/**
 * @internal
 * Per-frame GPU state cache.  GPUCommandEncoder / GPURenderPipeline /
 * GPUShaderModule objects are all device-specific, so the cache must be
 * per-engine.  Static accessors delegate to the active engine's cache via
 * getActiveEngine().
 */

/** Per-engine GPU context cache stored on the Engine3D instance. */
export interface GPUContextCache {
    lastGeometry: GeometryBase | null;
    lastPipeline: GPURenderPipeline | null;
    lastShader: RenderShaderPass | null;
    lastRenderPassState: RendererPassState | null;
    LastCommand: GPUCommandEncoder | null;
}

export function createGPUContextCache(): GPUContextCache {
    return {
        lastGeometry: null,
        lastPipeline: null,
        lastShader: null,
        lastRenderPassState: null,
        LastCommand: null,
    };
}

/**
 * WebGPU api use context
 */
export class GPUContext {
    // ── per-engine state accessors ────────────────────────────────────────────
    private static _cache(): GPUContextCache { return getActiveEngine()?._gpuContextCache; }

    public static get lastGeometry(): GeometryBase { return GPUContext._cache()?.lastGeometry; }
    public static set lastGeometry(v: GeometryBase) { const c = GPUContext._cache(); if (c) c.lastGeometry = v; }

    public static get lastPipeline(): GPURenderPipeline { return GPUContext._cache()?.lastPipeline; }
    public static set lastPipeline(v: GPURenderPipeline) { const c = GPUContext._cache(); if (c) c.lastPipeline = v; }

    public static get lastShader(): RenderShaderPass { return GPUContext._cache()?.lastShader; }
    public static set lastShader(v: RenderShaderPass) { const c = GPUContext._cache(); if (c) c.lastShader = v; }

    public static get lastRenderPassState(): RendererPassState { return GPUContext._cache()?.lastRenderPassState; }
    public static set lastRenderPassState(v: RendererPassState) { const c = GPUContext._cache(); if (c) c.lastRenderPassState = v; }

    public static get LastCommand(): GPUCommandEncoder { return GPUContext._cache()?.LastCommand; }
    public static set LastCommand(v: GPUCommandEncoder) { const c = GPUContext._cache(); if (c) c.LastCommand = v; }

    // ── global frame counters (shared across engines, useful for profiling) ──
    public static drawCount: number = 0;
    public static renderPassCount: number = 0;
    public static geometryCount: number = 0;
    public static pipelineCount: number = 0;
    public static matrixCount: number = 0;

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

    /**
     * begin or end clean all use cache
     */
    public static cleanCache() {
        this.lastGeometry = null;
        this.lastPipeline = null;
        this.lastShader = null;
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
        if (this.LastCommand) {
            webGPUContext.device.queue.submit([this.LastCommand.finish()]);
        }
        this.LastCommand = webGPUContext.device.createCommandEncoder();
        return this.LastCommand;
    }

    /**
     * end CommandEncoder record and submit
     */
    public static endCommandEncoder(command: GPUCommandEncoder) {
        if (this.LastCommand == command) {
            webGPUContext.device.queue.submit([this.LastCommand.finish()]);
            this.LastCommand = null;
            ProfilerUtil.countStart("GPUContext", "endCommandEncoder");
        }
    }

    /**
     * create a renderBundle gpu object
     */
    public static recordBundleEncoder(des: GPURenderBundleEncoderDescriptor): GPURenderBundleEncoder {
        let bundleEncoder: GPURenderBundleEncoder = webGPUContext.device.createRenderBundleEncoder(des);
        return bundleEncoder;
    }

    /**
     * render pass start return current use gpu renderPassEncoder
     */
    public static beginRenderPass(command: GPUCommandEncoder, renderPassState: RendererPassState): GPURenderPassEncoder {
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

    public static drawIndexed(encoder: GPURenderPassEncoder, indexCount: GPUSize32,
        instanceCount?: GPUSize32,
        firstIndex?: GPUSize32,
        baseVertex?: GPUSignedOffset32,
        firstInstance?: GPUSize32) {
        encoder.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
        this.drawCount++;
    }

    public static draw(encoder: GPURenderPassEncoder, vertexCount: GPUSize32,
        instanceCount?: GPUSize32,
        firstVertex?: GPUSize32,
        firstInstance?: GPUSize32) {
        encoder.draw(vertexCount, instanceCount, firstVertex, firstInstance);
        this.drawCount++;
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
