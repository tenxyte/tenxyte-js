import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildDeviceInfo } from '../src/utils/device_info';
import { EventEmitter } from '../src/utils/events';

describe('Utilities', () => {
    describe('buildDeviceInfo', () => {
        it('should respect custom properties', () => {
            const info = buildDeviceInfo({
                os: 'macos',
                osVersion: '14.0',
                device: 'desktop',
                arch: 'arm64',
                app: 'tenxyte-test',
                appVersion: '2.0.0',
                runtime: 'node',
                runtimeVersion: 'v20.0.0',
                timezone: 'America/New_York'
            });
            // v=1|os=macos;osv=14.0|device=desktop|arch=arm64|app=tenxyte-test;appv=2.0.0|runtime=node;rtv=v20.0.0|tz=America/New_York
            expect(info).toContain('os=macos;osv=14.0');
            expect(info).toContain('app=tenxyte-test;appv=2.0.0');
            expect(info).toContain('runtime=node;rtv=v20.0.0');
            expect(info).toContain('tz=America/New_York');
            expect(info).toContain('v=1');
            expect(info).toContain('device=desktop');
            expect(info).toContain('arch=arm64');
        });

        it('should generate sensible defaults in absence of custom info', () => {
            const info = buildDeviceInfo();
            expect(info).toContain('v=1');
            // Should have parsed process or window depending on env
        });
    });

    describe('EventEmitter', () => {
        type TestEvents = {
            'test:event': { data: string };
        };

        let emitter: EventEmitter<TestEvents>;

        beforeEach(() => {
            emitter = new EventEmitter();
        });

        it('should allow emitting and receiving events', () => {
            const mockCb = vi.fn();
            emitter.on('test:event', mockCb);
            emitter.emit('test:event', { data: 'hello' });
            expect(mockCb).toHaveBeenCalledWith({ data: 'hello' });
        });

        it('should allow unsubscribing', () => {
            const mockCb = vi.fn();
            const unsub = emitter.on('test:event', mockCb);
            unsub();
            emitter.emit('test:event', { data: 'hello' });
            expect(mockCb).not.toHaveBeenCalled();
        });

        it('should execute "once" subscriptions exactly once', () => {
            const mockCb = vi.fn();
            emitter.once('test:event', mockCb);
            emitter.emit('test:event', { data: 'one' });
            emitter.emit('test:event', { data: 'two' });
            expect(mockCb).toHaveBeenCalledTimes(1);
            expect(mockCb).toHaveBeenCalledWith({ data: 'one' });
        });
    });
});
