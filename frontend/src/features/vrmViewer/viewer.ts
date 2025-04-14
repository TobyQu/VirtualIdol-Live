import * as THREE from "three";
import {Model} from "./model";
import {loadVRMAnimation} from "@/lib/VRMAnimation/loadVRMAnimation";
import {buildUrl} from "@/utils/buildUrl";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {loadMixamoAnimation} from "../mixamo/loadMixamoAnimation";

type EventCallback = () => void;
type EventMap = {
  [key: string]: EventCallback[];
};

/**
 * three.jsを使った3Dビューワー
 *
 * setup()でcanvasを渡してから使う
 */
export class Viewer {
    public isReady: boolean;
    public model?: Model;

    private _renderer?: THREE.WebGLRenderer;
    private _clock: THREE.Clock;
    private _scene: THREE.Scene;
    private _camera?: THREE.PerspectiveCamera;
    private _cameraControls?: OrbitControls;
    private _events: EventMap = {};
    private _animationFrameId?: number;

    constructor() {
        this.isReady = false;

        // scene
        const scene = new THREE.Scene();
        this._scene = scene;

        // light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1.0, 1.0, 1.0).normalize();
        scene.add(directionalLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        // animate
        this._clock = new THREE.Clock();
        this._clock.start();
    }

    // 事件系统
    public on(eventName: string, callback: EventCallback): void {
        if (!this._events[eventName]) {
            this._events[eventName] = [];
        }
        this._events[eventName].push(callback);
    }

    public off(eventName: string, callback: EventCallback): void {
        if (!this._events[eventName]) return;
        this._events[eventName] = this._events[eventName].filter(cb => cb !== callback);
    }

    private emit(eventName: string): void {
        if (!this._events[eventName]) return;
        this._events[eventName].forEach(callback => callback());
    }

    public loadVrm(url: string, scale: number = 1.0) {
        if (this.model?.vrm) {
            this.unloadVRM();
        }

        console.log("Loading VRM model:", url, "with scale:", scale);
        
        // 添加简单的URL验证
        if (!url || url.trim() === '') {
            console.error("Invalid VRM model URL provided");
            return;
        }

        // gltf and vrm
        this.model = new Model(this._camera || new THREE.Object3D());
        this.model.loadVRM(url, scale).then(async () => {
            if (!this.model?.vrm) {
                console.error("Failed to load VRM model:", url);
                return;
            }

            // 在这里设置模型面向相机
            if (this._camera) {
                // 获取相机相对于世界原点的方向
                const cameraDirection = new THREE.Vector3();
                this._camera.getWorldDirection(cameraDirection);

                // 使模型面向相机的方向
                this.model.vrm.scene.rotation.y = this.model.vrm.scene.rotation.y + 0.1
                this.model.vrm.scene.rotation.x = this.model.vrm.scene.rotation.x + 0.2
            }

            // Disable frustum culling
            this.model.vrm.scene.traverse((obj) => {
                obj.frustumCulled = false;
            });

            this._scene.add(this.model.vrm.scene);
            
            // 触发VRM模型加载完成事件
            this.emit('vrmLoaded');

            try {
                // 加载所有人物动作
                console.log("开始加载模型动画...");
                await this.loadAnimationSafely("idle_01", "/assets/animations/daily/idle_01.fbx");
                
                // 播放默认动画
                if (this.model && this.model.clipMap.has("idle_01")) {
                    this.model.loadFBX("idle_01");
                }
                
                // 触发动画加载完成事件
                this.emit('animationsLoaded');

                // 后台加载其他动画
                setTimeout(async () => {
                    const animationPromises = [
                        // 日常动作
                        this.loadAnimationSafely("idle_02", "/assets/animations/daily/idle_02.fbx"),
                        this.loadAnimationSafely("idle_03", "/assets/animations/daily/idle_03.fbx"),
                        this.loadAnimationSafely("idle_happy_01", "/assets/animations/daily/idle_happy_01.fbx"),
                        this.loadAnimationSafely("idle_happy_02", "/assets/animations/daily/idle_happy_02.fbx"),
                        this.loadAnimationSafely("idle_happy_03", "/assets/animations/daily/idle_happy_03.fbx"),
                        this.loadAnimationSafely("standing_greeting", "/assets/animations/daily/standing_greeting.fbx"),
                        this.loadAnimationSafely("thinking", "/assets/animations/daily/thinking.fbx"),
                        
                        // 表情动作
                        this.loadAnimationSafely("excited", "/assets/animations/emote/excited.fbx"),
                        this.loadAnimationSafely("angry", "/assets/animations/emote/angry.fbx"),
                        
                        // 舞蹈动作
                        this.loadAnimationSafely("silly_dancing", "/assets/animations/dance/silly_dancing.fbx"),
                        this.loadAnimationSafely("rumba_dancing", "/assets/animations/dance/rumba_dancing.fbx")
                    ];
                    
                    // 等待所有动画加载完成
                    await Promise.all(animationPromises);
                    console.log("所有动画加载完成");
                }, 1000);
            } catch (error) {
                console.error("加载动画时出错:", error);
                // 即使出错，也触发动画加载完成事件，避免UI卡在加载状态
                this.emit('animationsLoaded');
            }

            // HACK: アニメーションの原点がずれているので再生後にカメラ位置を調整する
            requestAnimationFrame(() => {
                this.resetCamera();
                
                // 稳定物理效果，特别是头发和衣服
                if (this.model?.vrm?.springBoneManager) {
                    try {
                        let updateCount = 0;
                        const maxUpdates = 30; // 连续更新30次以稳定物理
                        
                        const stabilizePhysics = () => {
                            if (updateCount < maxUpdates && this.model?.vrm) {
                                try {
                                    // 强制更新物理系统
                                    this.model.vrm.update(0.016);
                                    updateCount++;
                                    requestAnimationFrame(stabilizePhysics);
                                } catch (err) {
                                    console.warn("稳定物理系统时出错:", err);
                                    // 出错时停止更新循环
                                }
                            }
                        };
                        
                        // 开始稳定物理效果
                        stabilizePhysics();
                    } catch (error) {
                        console.warn("初始化物理稳定过程时出错:", error);
                        // 错误处理，确保不影响模型加载
                    }
                }
            });
        }).catch(error => {
            console.error("加载VRM模型失败:", error);
            // 出错时触发事件，避免UI卡住
            this.emit('vrmLoaded');
            this.emit('animationsLoaded');
        });
    }

    public unloadVRM(): void {
        if (this.model?.vrm) {
            this._scene.remove(this.model.vrm.scene);
            this.model?.unLoadVrm();
        }
    }

    /**
     * Reactで管理しているCanvasを後から設定する
     */
    public setup(canvas: HTMLCanvasElement) {
        const parentElement = canvas.parentElement;
        const width = parentElement?.clientWidth || canvas.width;
        const height = parentElement?.clientHeight || canvas.height;

        // renderer
        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: true,
        });
        renderer.setClearColor(0x000000, 0);
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputEncoding = THREE.sRGBEncoding;
        this._renderer = renderer;

        // camera
        const camera = new THREE.PerspectiveCamera(20.0, width / height, 0.1, 20.0);
        camera.position.set(0, 1.3, 1.5);
        this._camera = camera;

        // controls
        const cameraControls = new OrbitControls(camera, renderer.domElement);
        cameraControls.target.set(0, 1.3, 0);
        cameraControls.screenSpacePanning = true;
        cameraControls.minDistance = 0.5;
        cameraControls.maxDistance = 5;
        cameraControls.update();
        
        this._cameraControls = cameraControls;

        // 初始化为就绪状态
        this.isReady = true;

        // 窗口调整大小时重置相机
        window.addEventListener("resize", () => {
            this.resize();
        });

        // Start animation loop
        this.update();
    }

    /**
     * canvasの親要素を参照してサイズを変更する
     */
    public resize() {
        if (!this._renderer) return;

        const parentElement = this._renderer.domElement.parentElement;
        if (!parentElement) return;

        this._renderer.setSize(
            parentElement.clientWidth,
            parentElement.clientHeight
        );

        if (!this._camera) return;
        this._camera.aspect =
            parentElement.clientWidth / parentElement.clientHeight;
        this._camera.updateProjectionMatrix();
    }

    /**
     * VRMのheadノードを参照してカメラ位置を調整する
     */
    public resetCamera() {
        const headNode = this.model?.vrm?.humanoid.getNormalizedBoneNode("head");

        if (headNode) {
            const headWPos = headNode.getWorldPosition(new THREE.Vector3());
            
            // 更新控制器的目标点为头部位置
            this._cameraControls?.target.set(headWPos.x, headWPos.y, headWPos.z);
            
            // 根据模型缩放调整相机位置
            const scale = this.model?.modelScale || 1.0;
            
            // 设置相机位置，高度与头部一致
            this._camera?.position.set(
                this._camera.position.x,
                headWPos.y,
                this._camera.position.z
            );
            
            // 根据模型缩放调整控制器的距离限制
            if (this._cameraControls) {
                this._cameraControls.minDistance = 0.5 * scale;
                this._cameraControls.maxDistance = 5.0 * scale;
            }
            
            // 更新控制器
            this._cameraControls?.update();
        }
    }

    public update = () => {
        this._animationFrameId = requestAnimationFrame(this.update);
        const delta = this._clock.getDelta();
        
        // 更新相机控制
        this._cameraControls?.update();
        
        // update vrm components
        if (this.model) {
            this.model.update(delta);
        }

        if (this._renderer && this._camera) {
            this._renderer.render(this._scene, this._camera);
        }
    };

    // 安全地加载动画的辅助方法
    public async loadAnimationSafely(animName: string, animPath: string): Promise<void> {
        if (!this.model || !this.model.vrm) {
            console.warn(`无法加载动画 ${animName}：VRM模型未加载`);
            return;
        }
        
        try {
            const animation = await loadMixamoAnimation(animPath, this.model.vrm);
            if (animation) {
                this.model.clipMap.set(animName, animation);
                console.log(`动画 ${animName} 加载成功`);
            } else {
                console.warn(`动画 ${animName} 加载失败：返回了空动画`);
            }
        } catch (error) {
            console.error(`加载动画 ${animName} 时出错:`, error);
        }
    }
}
