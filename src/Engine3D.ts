import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { webGPUContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap } from './gfx/renderJob/frame/RTResourceMap';

import { GlobalBindGroup } from './gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { RendererJob } from './gfx/renderJob/jobs/RendererJob';
import { Res } from './assets/Res';
import { ShaderLib } from './assets/shader/ShaderLib';
import { ShaderUtil } from './gfx/graphics/webGpu/shader/util/ShaderUtil';
import { ShadowLightsCollect } from './gfx/renderJob/collect/ShadowLightsCollect';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';
import { EngineContext } from './EngineContext';
import { InputSystem } from './io/InputSystem';

/**
 * Orillusion 3D Engine
 *
 * All static methods operate on a default internal EngineContext.
 * For multi-instance support, create additional EngineContext objects directly.
 *
 * -- Engine3D.setting.*
 * -- await Engine3D.init();
 * @group engine3D
 */
export class Engine3D {

    /**
     * @internal - default engine context created by Engine3D.init()
     */
    private static _defaultContext: EngineContext;

    /**
     * engine setting (global, shared across all engine instances)
     */
    public static setting: EngineSetting = {
        doublePrecision: false,

        occlusionQuery: {
            enable: true,
            debug: false,
        },
        pick: {
            enable: true,
            mode: `bound`,
            detail: `mesh`,
        },
        render: {
            debug: false,
            renderPassState: 4,
            renderState_left: 5,
            renderState_right: 5,
            renderState_split: 0.5,
            quadScale: 1,
            hdrExposure: 1.5,
            debugQuad: -1,
            maxPointLight: 1000,
            maxDirectLight: 4,
            maxSportLight: 1000,
            drawOpMin: 0,
            drawOpMax: Number.MAX_SAFE_INTEGER,
            drawTrMin: 0,
            drawTrMax: Number.MAX_SAFE_INTEGER,
            zPrePass: false,
            useLogDepth: false,
            useCompressGBuffer: false,
            gi: false,
            postProcessing: {
                bloom: {
                    downSampleStep: 3,
                    downSampleBlurSize: 9,
                    downSampleBlurSigma: 1.0,
                    upSampleBlurSize: 9,
                    upSampleBlurSigma: 1.0,
                    luminanceThreshole: 1.0,
                    bloomIntensity: 1.0,
                    hdr: 1.0
                },
                globalFog: {
                    debug: false,
                    enable: false,
                    fogType: 0.0,
                    fogHeightScale: 0.1,
                    start: 400,
                    end: 10,
                    density: 0.02,
                    ins: 0.5,
                    skyFactor: 0.5,
                    skyRoughness: 0.4,
                    overrideSkyFactor: 0.8,
                    fogColor: new Color(96 / 255, 117 / 255, 133 / 255, 1),
                    falloff: 0.7,
                    rayLength: 200.0,
                    scatteringExponent: 2.7,
                    dirHeightLine: 10.0,
                },
                godRay: {
                    blendColor: true,
                    rayMarchCount: 16,
                    scatteringExponent: 5,
                    intensity: 0.5
                },
                ssao: {
                    enable: false,
                    radius: 0.15,
                    bias: -0.1,
                    aoPower: 2.0,
                    debug: true,
                },
                outline: {
                    enable: false,
                    strength: 1,
                    groupCount: 4,
                    outlinePixel: 2,
                    fadeOutlinePixel: 4,
                    textureScale: 1,
                    useAddMode: false,
                    debug: true,
                },
                taa: {
                    enable: false,
                    jitterSeedCount: 8,
                    blendFactor: 0.1,
                    sharpFactor: 0.6,
                    sharpPreBlurFactor: 0.5,
                    temporalJitterScale: 0.13,
                    debug: true,
                },
                gtao: {
                    enable: false,
                    darkFactor: 1.0,
                    maxDistance: 5.0,
                    maxPixel: 50.0,
                    rayMarchSegment: 6,
                    multiBounce: false,
                    usePosFloat32: true,
                    blendColor: true,
                    debug: true,
                },
                ssr: {
                    enable: false,
                    pixelRatio: 1,
                    fadeEdgeRatio: 0.2,
                    rayMarchRatio: 0.5,
                    fadeDistanceMin: 600,
                    fadeDistanceMax: 2000,
                    roughnessThreshold: 0.5,
                    powDotRN: 0.2,
                    mixThreshold: 0.1,
                    debug: true,
                },
                fxaa: {
                    enable: false,
                },
                depthOfView: {
                    enable: false,
                    iterationCount: 3,
                    pixelOffset: 1.0,
                    near: 150,
                    far: 300,
                },
            },
        },
        shadow: {
            enable: true,
            type: 'HARD',
            pointShadowBias: 0.0005,
            shadowSize: 2048,
            pointShadowSize: 1024,
            shadowSoft: 0.005,
            shadowBound: 100,
            shadowBias: 0.05,
            needUpdate: true,
            autoUpdate: true,
            updateFrameRate: 2,
            csmMargin: 0.1,
            csmScatteringExp: 0.7,
            csmAreaScale: 0.4,
            debug: false,
        },
        gi: {
            enable: false,
            offsetX: 0,
            offsetY: 0,
            offsetZ: 0,
            probeSpace: 64,
            probeXCount: 4,
            probeYCount: 2,
            probeZCount: 4,
            probeSize: 32,
            probeSourceTextureSize: 2048,
            octRTMaxSize: 2048,
            octRTSideSize: 16,
            maxDistance: 64 * 1.73,
            normalBias: 0.25,
            depthSharpness: 1,
            hysteresis: 0.98,
            lerpHysteresis: 0.01,
            irradianceChebyshevBias: 0.01,
            rayNumber: 144,
            irradianceDistanceBias: 32,
            indirectIntensity: 1.0,
            ddgiGamma: 2.2,
            bounceIntensity: 0.025,
            probeRoughness: 1,
            realTimeGI: false,
            debug: false,
            autoRenderProbe: false,
        },
        sky: {
            type: 'HDRSKY',
            sky: null,
            skyExposure: 1.0,
            defaultFar: 65536,
            defaultNear: 1,
        },
        light: {
            maxLight: 4096,
        },
        material: {
            materialChannelDebug: false,
            materialDebug: false
        },
        loader: {
            numConcurrent: 20,
        },
        reflectionSetting: {
            reflectionProbeMaxCount: 8,
            reflectionProbeSize: 256,
            width: 256 * 6,
            height: 8 * 256,
            enable: true
        }
    };

    // =================== Backward-compatible static getters ===================

    /**
     * Resource manager of the default engine instance.
     */
    public static get res(): Res {
        return Engine3D._defaultContext?.res;
    }

    public static set res(v: Res) {
        if (Engine3D._defaultContext) Engine3D._defaultContext.res = v;
    }

    /**
     * Input system of the default engine instance.
     */
    public static get inputSystem(): InputSystem {
        return Engine3D._defaultContext?.inputSystem;
    }

    /**
     * Views of the default engine instance.
     */
    public static get views(): View3D[] {
        return Engine3D._defaultContext?.views;
    }

    public static set views(v: View3D[]) {
        if (Engine3D._defaultContext) Engine3D._defaultContext.views = v;
    }

    /**
     * @internal
     */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D._defaultContext?.renderJobs;
    }

    /**
     * Set engine render frameRate 24/30/60/114/120/144/240/360 fps or other
     */
    public static get frameRate(): number {
        return Engine3D._defaultContext?._frameRate ?? 360;
    }

    public static set frameRate(value: number) {
        if (Engine3D._defaultContext) Engine3D._defaultContext.frameRate = value;
    }

    /**
     * Get render window size width and height
     */
    public static get size(): number[] {
        return webGPUContext.presentationSize;
    }

    /**
     * Get render window aspect
     */
    public static get aspect(): number {
        return webGPUContext.aspect;
    }

    /**
     * Get render window size width
     */
    public static get width(): number {
        return webGPUContext.windowWidth;
    }

    /**
     * Get render window size height
     */
    public static get height(): number {
        return webGPUContext.windowHeight;
    }

    // =================== Static lifecycle methods ===================

    /**
     * Create the default engine instance and initialize WebGPU.
     * For multi-instance use, create an EngineContext directly.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        Engine3D.setting = { ...Engine3D.setting, ...descriptor.engineSetting };

        await WasmMatrix.init(Matrix4.allocCount, Engine3D.setting.doublePrecision);

        await webGPUContext.init(descriptor.canvasConfig);

        Engine3D.setting.reflectionSetting.width = Engine3D.setting.reflectionSetting.reflectionProbeSize * 6;
        Engine3D.setting.reflectionSetting.height = Engine3D.setting.reflectionSetting.reflectionProbeSize * Engine3D.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            Engine3D.setting.reflectionSetting.width,
            Engine3D.setting.reflectionSetting.height,
            false
        );

        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        RTResourceMap.init();
        ShadowLightsCollect.init();

        Engine3D._defaultContext = new EngineContext();
        await Engine3D._defaultContext.init(descriptor);
    }

    /**
     * Set render view and start renderer (default engine instance).
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._defaultContext.startRenderView(view);
    }

    /**
     * Set render views and start renderer (default engine instance).
     */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._defaultContext.startRenderViews(views);
    }

    /**
     * Get view render job instance (default engine instance).
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._defaultContext?.getRenderJob(view);
    }

    /**
     * Pause the default engine render
     */
    public static pause(): void {
        Engine3D._defaultContext?.pause();
    }

    /**
     * Resume the default engine render
     */
    public static resume(): void {
        Engine3D._defaultContext?.resume();
    }
}
