import { Camera3D } from "../../core/Camera3D";
import { GeometryBase } from "../../core/geometry/GeometryBase";
import { ProfilerUtil } from "../../util/ProfilerUtil";
import { webGPUContext } from "../graphics/webGpu/Context3D";
import { GlobalBindGroup } from "../graphics/webGpu/core/bindGroups/GlobalBindGroup";
import { Texture } from "../graphics/webGpu/core/texture/Texture";
import { ComputeShader } from "../graphics/webGpu/shader/ComputeShader";
import { RenderShaderPass } from "../graphics/webGpu/shader/RenderShaderPass";
import { RendererPassState } from "./passRenderer/state/RendererPassState";

let _active: GPUContext;

/** @internal */
export function setActiveGPUContext(g: GPUContext): void {
    _active = g;
}

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

    // ---- Instance methods ----

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
            if (bindGroup) encoder.setBindGroup(i, bindGroup);
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
        instanceCount?: GPUSize32, firstIndex?: GPUSize32,
        baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32) {
        encoder.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
        this.drawCount++;
    }

    public draw(encoder: GPURenderPassEncoder, vertexCount: GPUSize32,
        instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32) {
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
            computes[i].compute(computePass);
        }
        computePass.end();
    }

    public copyTexture(command: GPUCommandEncoder, source: Texture, dest: Texture) {
        command.copyTextureToTexture(
            { texture: source.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { texture: dest.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { width: dest.width, height: dest.height, depthOrArrayLayers: 1 },
        );
    }

    // ---- Static delegation API (backward compatible) ----

    public static get lastGeometry() { return _active?.lastGeometry; }
    public static set lastGeometry(v) { if (_active) _active.lastGeometry = v; }
    public static get lastPipeline() { return _active?.lastPipeline; }
    public static set lastPipeline(v) { if (_active) _active.lastPipeline = v; }
    public static get lastShader() { return _active?.lastShader; }
    public static set lastShader(v) { if (_active) _active.lastShader = v; }
    public static get drawCount() { return _active?.drawCount ?? 0; }
    public static set drawCount(v) { if (_active) _active.drawCount = v; }
    public static get renderPassCount() { return _active?.renderPassCount ?? 0; }
    public static set renderPassCount(v) { if (_active) _active.renderPassCount = v; }
    public static get geometryCount() { return _active?.geometryCount ?? 0; }
    public static set geometryCount(v) { if (_active) _active.geometryCount = v; }
    public static get pipelineCount() { return _active?.pipelineCount ?? 0; }
    public static set pipelineCount(v) { if (_active) _active.pipelineCount = v; }
    public static get matrixCount() { return _active?.matrixCount ?? 0; }
    public static set matrixCount(v) { if (_active) _active.matrixCount = v; }
    public static get lastRenderPassState() { return _active?.lastRenderPassState; }
    public static set lastRenderPassState(v) { if (_active) _active.lastRenderPassState = v; }
    public static get LastCommand() { return _active?.LastCommand; }
    public static set LastCommand(v) { if (_active) _active.LastCommand = v; }

    public static bindPipeline(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderShader: RenderShaderPass): boolean {
        return _active?.bindPipeline(encoder, renderShader) ?? false;
    }

    public static bindCamera(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, camera: Camera3D) {
        _active?.bindCamera(encoder, camera);
    }

    public static bindGeometryBuffer(encoder: GPURenderPassEncoder | GPURenderBundleEncoder, geometry: GeometryBase) {
        _active?.bindGeometryBuffer(encoder, geometry);
    }

    public static cleanCache() {
        _active?.cleanCache();
    }

    public static createPipeline(gpuRenderPipeline: GPURenderPipelineDescriptor): GPURenderPipeline {
        return _active?.createPipeline(gpuRenderPipeline);
    }

    public static beginCommandEncoder(): GPUCommandEncoder {
        return _active?.beginCommandEncoder();
    }

    public static endCommandEncoder(command: GPUCommandEncoder) {
        _active?.endCommandEncoder(command);
    }

    public static recordBundleEncoder(des: GPURenderBundleEncoderDescriptor): GPURenderBundleEncoder {
        return _active?.recordBundleEncoder(des);
    }

    public static beginRenderPass(command: GPUCommandEncoder, renderPassState: RendererPassState): GPURenderPassEncoder {
        return _active?.beginRenderPass(command, renderPassState);
    }

    public static drawIndexed(encoder: GPURenderPassEncoder, indexCount: GPUSize32,
        instanceCount?: GPUSize32, firstIndex?: GPUSize32,
        baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32) {
        _active?.drawIndexed(encoder, indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
    }

    public static draw(encoder: GPURenderPassEncoder, vertexCount: GPUSize32,
        instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32) {
        _active?.draw(encoder, vertexCount, instanceCount, firstVertex, firstInstance);
    }

    public static endPass(encoder: GPURenderPassEncoder) {
        _active?.endPass(encoder);
    }

    public static computeCommand(command: GPUCommandEncoder, computes: ComputeShader[]) {
        _active?.computeCommand(command, computes);
    }

    public static copyTexture(command: GPUCommandEncoder, source: Texture, dest: Texture) {
        _active?.copyTexture(command, source, dest);
    }
}
