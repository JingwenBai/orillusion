/**
 * Multi-instance Engine3D API smoke tests.
 * Run with vitest / jest (requires WebGPU environment or mocks).
 */
import { Engine3D } from '../src/Engine3D';
import { EngineRegistry } from '../src/util/EngineRegistry';
import { ComponentCollect } from '../src/gfx/renderJob/collect/ComponentCollect';
import { RTResourceMap } from '../src/gfx/renderJob/frame/RTResourceMap';
import { GlobalBindGroup } from '../src/gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { ShadowLightsCollect } from '../src/gfx/renderJob/collect/ShadowLightsCollect';

describe('Engine3D multi-instance architecture', () => {

    test('each Engine3D instance is independent', () => {
        const engine1 = new Engine3D();
        const engine2 = new Engine3D();

        expect(engine1._engineId).not.toBe(engine2._engineId);
        expect(engine1.componentCollect).not.toBe(engine2.componentCollect);
        expect(engine1.shadowLightsCollect).not.toBe(engine2.shadowLightsCollect);
        expect(engine1.globalBindGroup).not.toBe(engine2.globalBindGroup);
        expect(engine1.rtResourceMap).not.toBe(engine2.rtResourceMap);
        expect(engine1.setting).not.toBe(engine2.setting);
    });

    test('EngineRegistry.active routes to the last set instance', () => {
        const engine1 = new Engine3D();
        const engine2 = new Engine3D();

        EngineRegistry.setActive(engine1);
        expect(EngineRegistry.active).toBe(engine1);

        EngineRegistry.setActive(engine2);
        expect(EngineRegistry.active).toBe(engine2);
    });

    test('RTResourceMap static facade routes to active engine instance', () => {
        const engine1 = new Engine3D();
        const engine2 = new Engine3D();

        EngineRegistry.setActive(engine1);
        engine1.rtResourceMap.rtTextureMap.set('test-key', {} as any);

        EngineRegistry.setActive(engine2);
        // engine2 should not see engine1's texture
        expect(RTResourceMap.getTexture('test-key')).toBeUndefined();
    });

    test('ComponentCollect static facade routes by view', () => {
        const engine1 = new Engine3D();
        const engine2 = new Engine3D();
        const mockView1 = { id: 'view1' } as any;
        const mockView2 = { id: 'view2' } as any;

        EngineRegistry.register(mockView1, engine1);
        EngineRegistry.register(mockView2, engine2);

        const mockComponent = { object3D: {}, enable: true } as any;
        const mockCall = () => {};

        ComponentCollect.bindUpdate(mockView1, mockComponent, mockCall);

        // engine1 should see the update for view1
        expect(engine1.componentCollect.componentsUpdateList.has(mockView1)).toBe(true);
        // engine2 should not
        expect(engine2.componentCollect.componentsUpdateList.has(mockView1)).toBe(false);
    });

    test('Engine3D.setting static getter routes through EngineRegistry.active', () => {
        const engine1 = new Engine3D();
        engine1.setting.render.hdrExposure = 2.5;

        EngineRegistry.setActive(engine1);
        expect(Engine3D.setting.render.hdrExposure).toBe(2.5);

        const engine2 = new Engine3D();
        engine2.setting.render.hdrExposure = 1.0;

        EngineRegistry.setActive(engine2);
        expect(Engine3D.setting.render.hdrExposure).toBe(1.0);
    });
});
