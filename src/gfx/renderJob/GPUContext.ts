import { Camera3D } from "../../core/Camera3D";
import { GeometryBase } from "../../core/geometry/GeometryBase";
import { ProfilerUtil } from "../../util/ProfilerUtil";
import { webGPUContext } from "../graphics/webGpu/Context3D";
import { _activeGlobalBindGroup, GlobalBindGroup } from "../graphics/webGpu/core/bindGroups/GlobalBindGroup";
import { Texture } from "../graphics/webGpu/core/texture/Texture";
import { ComputeShader } from "../graphics/webGpu/shader/ComputeShader";
import { RenderShaderPass } from "../graphics/webGpu/shader/RenderShaderPass";
import { RendererPassState } from "./passRenderer/state/RendererPassState";

/** @internal active per-engine GPUContext, set by Engine3D.activate() */
export let _activeGPUContext: GPUContext | null = null;
export function setActiveGPUContext(ctx: GPUContext): void {
    _activeGPUContext = ctx;
}

/**
 * WebGPU api use context (per-engine instance)
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

    /**
     * renderPipeline before render need bind pipeline
     * @param encoder current GPURenderPassEncoder {@link GPURenderPassEncoder } {@link GPURenderBundleEncoder }
     * @param renderShader render pass shader {@link RenderShaderPass }
     * @returns
     */
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

    /**
     * render before need make sure use camera
     * @param encoder current GPURenderPassEncoder {@link GPURenderPassEncoder } {@link GPURenderBundleEncoder }
     * @param camera use camera {@link Camera3D}
     * @param globalBindGroup engine's global bind group
     */
    public bindCamera(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, camera: Camera3D, globalBindGroup: GlobalBindGroup) {
        let cameraBindGroup = globalBindGroup.getCameraGroup(camera);
        encoder.setBindGroup(0, cameraBindGroup.globalBindGroup);
    }

    /**
     * bind geometry vertex buffer to current render pipeline
     * @param encoder current GPURenderPassEncoder {@link GPURenderPassEncoder } {@link GPURenderBundleEncoder }
     * @param geometry engine geometry
     */
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

    /**
     * begin or end clean all use cache
     */
    public cleanCache() {
        this.lastGeometry = null;
        this.lastPipeline = null;
        this.lastShader = null;
    }

    /**
     * create a render pipeline
     * @param gpuRenderPipeline {@link GPURenderPipelineDescriptor}
     * @returns
     */
    public createPipeline(gpuRenderPipeline: GPURenderPipelineDescriptor) {
        ProfilerUtil.countStart("GPUContext", "pipeline");
        let pipeline: GPURenderPipeline = webGPUContext.device.createRenderPipeline(gpuRenderPipeline);
        return pipeline;
    }

    /**
     * auto get webgpu commandEncoder and start a command encoder
     * @returns commandEncoder {@link GPUCommandEncoder}
     */
    public beginCommandEncoder(): GPUCommandEncoder {
        ProfilerUtil.countStart("GPUContext", "beginCommandEncoder");
        if (this.LastCommand) {
            webGPUContext.device.queue.submit([this.LastCommand.finish()]);
        }
        this.LastCommand = webGPUContext.device.createCommandEncoder();
        return this.LastCommand;
    }

    /**
     * end CommandEncoder record and submit
     * @param command {@link GPUCommandEncoder}
     */
    public endCommandEncoder(command: GPUCommandEncoder) {
        if (this.LastCommand == command) {
            webGPUContext.device.queue.submit([this.LastCommand.finish()]);
            this.LastCommand = null;
            ProfilerUtil.countStart("GPUContext", "endCommandEncoder");
        }
    }

    /**
     * create a renderBundle gpu object by GPURenderBundleEncoderDescriptor
     * @param des {@link GPURenderBundleEncoderDescriptor}
     * @returns renderBundleEncoder {@link GPURenderBundleEncoder}
     */
    public recordBundleEncoder(des: GPURenderBundleEncoderDescriptor): GPURenderBundleEncoder {
        let bundleEncoder: GPURenderBundleEncoder = webGPUContext.device.createRenderBundleEncoder(des);
        return bundleEncoder;
    }

    /**
     * render pass start return current use gpu renderPassEncoder
     * @param command {@link GPUCommandEncoder}
     * @param renderPassState {@link RendererPassState}
     * @returns encoder {@link GPURenderPassEncoder}
     */
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

    /**
     * Start the rendering process to draw any pipes
     */
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

    /**
     * The GPU must be informed of the end of encoder recording
     * @param encoder
     */
    public endPass(encoder: GPURenderPassEncoder) {
        encoder.insertDebugMarker("end")
        encoder.end();
    }

    /**
     * Perform the final calculation and submit the Shader to the GPU
     * @param command
     * @param computes
     */
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

    // Static backward-compat delegates — route through the active engine GPUContext
    public static get lastRenderPassState(): RendererPassState { return _activeGPUContext?.lastRenderPassState; }
    public static get LastCommand(): GPUCommandEncoder { return _activeGPUContext?.LastCommand; }
    public static cleanCache() { _activeGPUContext?.cleanCache(); }
    public static beginCommandEncoder(): GPUCommandEncoder { return _activeGPUContext?.beginCommandEncoder(); }
    public static endCommandEncoder(command: GPUCommandEncoder) { _activeGPUContext?.endCommandEncoder(command); }
    public static beginRenderPass(command: GPUCommandEncoder, renderPassState: RendererPassState): GPURenderPassEncoder {
        return _activeGPUContext?.beginRenderPass(command, renderPassState);
    }
    public static endPass(encoder: GPURenderPassEncoder) { _activeGPUContext?.endPass(encoder); }
    public static bindCamera(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, camera: Camera3D) {
        _activeGPUContext?.bindCamera(encoder, camera, _activeGlobalBindGroup);
    }
    public static bindPipeline(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderShader: RenderShaderPass): boolean {
        return _activeGPUContext?.bindPipeline(encoder, renderShader);
    }
    public static bindGeometryBuffer(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, geometry: GeometryBase) {
        _activeGPUContext?.bindGeometryBuffer(encoder, geometry);
    }
    public static recordBundleEncoder(des: GPURenderBundleEncoderDescriptor): GPURenderBundleEncoder {
        return _activeGPUContext?.recordBundleEncoder(des);
    }
    public static drawIndexed(encoder: GPURenderPassEncoder, indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32) {
        _activeGPUContext?.drawIndexed(encoder, indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
    }
    public static draw(encoder: GPURenderPassEncoder, vertexCount: GPUSize32, instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32) {
        _activeGPUContext?.draw(encoder, vertexCount, instanceCount, firstVertex, firstInstance);
    }
    public static createPipeline(gpuRenderPipeline: GPURenderPipelineDescriptor): GPURenderPipeline {
        return _activeGPUContext?.createPipeline(gpuRenderPipeline);
    }
    public static computeCommand(command: GPUCommandEncoder, computes: ComputeShader[]) {
        _activeGPUContext?.computeCommand(command, computes);
    }
    public static copyTexture(command: GPUCommandEncoder, source: Texture, dest: Texture) {
        _activeGPUContext?.copyTexture(command, source, dest);
    }
}
