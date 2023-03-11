import * as THREE from '../build/three.module.js';
import { OrbitControls } from "../examples/jsm/controls/OrbitControls.js"
import {GLTFLoader} from "../examples/jsm/loaders/GLTFLoader.js"
// fps 표시용 모듈
import Stats from "../examples/jsm/libs/stats.module.js";

// 충돌 이벤트를 위한 import
import { Octree } from "../examples/jsm/math/Octree.js"     // 3차원 공간 분할
import { Capsule } from "../examples/jsm/math/Capsule.js"

class App {
    constructor() {
        const divContainer = document.querySelector("#webgl-container");
        this._divContainer = divContainer;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        divContainer.appendChild(renderer.domElement);

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.VSMShadowMap;

        this._renderer = renderer;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xaaaaff)
        this._scene = scene;

        this._setupOctree();
        this._setupCamera();
        this._setupLight();
        this._setupModel();
        this._setupControls();

        window.onresize = this.resize.bind(this);
        this.resize();

        requestAnimationFrame(this.render.bind(this));
    }

    _setupOctree(){
        this._worldOctree = new Octree();
    }

    _setupControls() {
        this._controls = new OrbitControls(this._camera, this._divContainer);
        this._controls.target.set(0,100,0);
        this._controls.enablePan = false;
        // 부드러운 화면 회전(관성)
        // this._controls.enableDamping = true;

        // fps 표시
        const stats = new Stats();
        this._divContainer.appendChild(stats.dom);
        this._fps = stats;

        // 키보드 이벤트
        this._pressedKeys = {};

        document.addEventListener("keydown",(event)=>{
            this._pressedKeys[event.key.toLowerCase()] = true;
            this._processAnimation();
        })

        document.addEventListener("keyup", (event)=>{
            this._pressedKeys[event.key.toLowerCase()] = false;
            this._processAnimation();
        })
    }

    _processAnimation(){
        let previousAnimationAction = this._currentAnimationAction;

        if(this._pressedKeys["w"] || this._pressedKeys["a"] || this._pressedKeys["s"] || this._pressedKeys["d"] ){
            if(this._pressedKeys[" "]){
                this._currentAnimationAction = this._animationsMap["RunningJump"]
                // 최대 속도
                this._maxSpeed = 350;
                // 가속도
                this._acceleration = 10;
            }else{
                this._currentAnimationAction = this._animationsMap["FastRun"]
                // this._speed = 350;
                this._maxSpeed = 350;
                this._acceleration = 10;
            }

        }else if(this._pressedKeys[" "]){
            this._currentAnimationAction = this._animationsMap["Jump"]
            this._speed = 0;
            this._maxSpeed = 0;
            this._acceleration = 0;
        }else{
            
            this._currentAnimationAction = this._animationsMap["T-Pose (No Animation)"];
            this._speed = 0;
            this._maxSpeed = 0;
            this._acceleration = 0;
        }

        if(previousAnimationAction !== this._currentAnimationAction){
            previousAnimationAction.fadeOut(0.5);
            this._currentAnimationAction.reset().fadeIn(0.5).play();
        }
    }

    changeAnimation(animationName){
        const previousAnimationAction = this._currentAnimationAction;
        this._currentAnimationAction = this._animationsMap[animationName];

        if(previousAnimationAction !== this._currentAnimationAction){
            previousAnimationAction.fadeOut(0.5);
            this._currentAnimationAction.reset().fadeIn(0.5).play();
        }
    }

    _setupAnimations(gltf){

        const model = gltf.scene;
        const mixer = new THREE.AnimationMixer(model);
        const gltfAnimations = gltf.animations;
        const domControls = document.querySelector("#controls");
        const animationsMap = {};

        gltfAnimations.forEach(animationClip=>{
            const name = animationClip.name;

            const domButton = document.createElement("div");
            domButton.classList.add("button");
            domButton.innerText = name;
            domControls.appendChild(domButton);

            domButton.addEventListener("click",()=>{
                const animationName = domButton.innerHTML;
                this.changeAnimation(animationName);
            })

            const animationAction = mixer.clipAction(animationClip);
            animationsMap[name] = animationAction;
        })

        this._mixer = mixer;
        this._animationsMap = animationsMap;
        this._currentAnimationAction = this._animationsMap["T-Pose (No Animation)"];
        this._currentAnimationAction.play();

    }

    _setupModel() {

        const planeGeometry = new THREE.PlaneGeometry(1000,1000);
        const planeMaterial = new THREE.MeshPhongMaterial({color: 0x87ff87});
        const plane = new THREE.Mesh(planeGeometry,planeMaterial);
        plane.rotation.x = -Math.PI/2;
        this._scene.add(plane);

        plane.receiveShadow = true; // 평면에 그림자 받게 하는 기능

        this._worldOctree.fromGraphNode(plane);


        new GLTFLoader().load("./data/cac-1678410035340.glb",(gltf)=>{
            const model = gltf.scene;
            this._scene.add(model);

            model.traverse(child => {
                if(child instanceof THREE.Mesh){
                    child.castShadow = true;
                }
            })
            
            // animations = THREE.AnimationClip[] 타입의 배열 이며 애니메이션 타입의 객체를 저장하고 있다.
            const animationClips = gltf.animations; 
            const mixer = new THREE.AnimationMixer(model);
            const animationsMap = {};
            animationClips.forEach(clip=>{
                const name = clip.name;
                console.log(name);
                animationsMap[name] = mixer.clipAction(clip);   // THREE.AnimationAction
            })

            const box= (new THREE.Box3).setFromObject(model);
            model.position.y = (box.max.y - box.min.y)/2;

            // 캐릭터의 캡슐 높이 값 얻어오기
            const height = box.max.y - box.min.y;
            // 캐릭터의 캡슐 지름 값 얻어오기
            const diameter = box.max.z - box.min.z;

            model._capsule = new Capsule(
                new THREE.Vector3(0,diameter/2,0),
                new THREE.Vector3(0,height - diameter/2,0),
                diameter/2
            );

            // 월드 좌표계 생성 (x:빨, y:초, z:파)
            const axisHelper = new THREE.AxesHelper(1000);
            this._scene.add(axisHelper);

            // 모델의 바운딩 박스 표시
            const boxHelper = new THREE.BoxHelper(model);
            this._scene.add(boxHelper)
            this._boxHelper = boxHelper;

            this._model = model;

            this._setupAnimations(gltf);

            this._createBox();

        });
    }

    _createBox(){
        const boxG = new THREE.BoxGeometry(100,10,100);
        const boxM = new THREE.MeshPhongMaterial({color: 0x87ff87});
        const boxMesh = new THREE.Mesh(boxG,boxM);

        boxMesh.receiveShadow = true;
        boxMesh.castShadow = true;
        boxMesh.position.set(150,0,0);
        this._scene.add(boxMesh);

        // 충돌검사하는 물체로 인식
        this._worldOctree.fromGraphNode(boxMesh);
        
    }

    _setupCamera() {
        const camera = new THREE.PerspectiveCamera(
            60, 
            window.innerWidth / window.innerHeight, 
            1, 
            5000
        );

        camera.position.y = 100;
        camera.position.z = -500;
        this._camera = camera;
    }

    _addPointLight(x,y,z,helperColor){
        const color = 0xffffff;
        const intensity = 2;

        const pointLight = new THREE.PointLight(color,intensity,2000);
        pointLight.position.set(x,y,z);

        this._scene.add(pointLight);

        const pointLightHelper = new THREE.PointLightHelper(pointLight,10,helperColor);
        this._scene.add(pointLightHelper);
    }

    _setupLight() {
        const ambientLight = new THREE.AmbientLight(0xffffff, .5);
        this._scene.add(ambientLight);

        this._addPointLight(500,150,500,0xff0000);
        this._addPointLight(-500,150,500,0xffff00);
        this._addPointLight(-500,150,-500,0x00ff00);
        this._addPointLight(500,150,-500,0x0000ff);

        const shadowLight = new THREE.DirectionalLight(0xffffff, 0.2);
        shadowLight.position.set(200, 500, 200);
        shadowLight.target.position.set(0, 0, 0);
        const directionalLightHelper = new THREE.DirectionalLightHelper(shadowLight, 10);
        this._scene.add(directionalLightHelper);

        this._scene.add(shadowLight);
        this._scene.add(shadowLight.target);
    

        shadowLight.castShadow = true;
        shadowLight.shadow.mapSize.width = 1024;
        shadowLight.shadow.mapSize.height = 1024;
        shadowLight.shadow.camera.top = shadowLight.shadow.camera.right = 700;
        shadowLight.shadow.camera.bottom = shadowLight.shadow.camera.left = -700;
        shadowLight.shadow.camera.near = 100;
        shadowLight.shadow.camera.far = 900;
        shadowLight.shadow.radius = 5;
        const shadowCameraHelper = new THREE.CameraHelper(shadowLight.shadow.camera);
        this._scene.add(shadowCameraHelper);

    }

    _previousDirectionOffset = 0;

    _directionOffset(){
        const pressedKeys = this._pressedKeys;
        let directionOffset = 0 // w

        if(pressedKeys['w']){
            if(pressedKeys['a']){
                directionOffset = Math.PI / 4     // w+a (45도) 
            }else if(pressedKeys['d']){
                directionOffset = - Math.PI / 4   // w+d (-45도) 
            }
        }else if(pressedKeys['s']){
            if(pressedKeys['a']){
                directionOffset = Math.PI / 4 + Math.PI / 2     // s+a (135도) 
            }else if(pressedKeys['d']){
                directionOffset = - Math.PI / 4 - Math.PI / 2   // s+d (-135도) 
            }else {
                directionOffset = Math.PI       // s (180도)
            }
        }else if(pressedKeys['a']){
            directionOffset = Math.PI / 2       // a (90도)
        }else if(pressedKeys['d']){
            directionOffset = - Math.PI / 2     // d (-90도)
        }else{
            directionOffset = this._previousDirectionOffset;
        }

        this._previousDirectionOffset = directionOffset;

        return directionOffset;
    }

    _speed = 0;
    _maxSpped = 0;
    _acceleration = 0;

    // 캐릭터가 바닥 위에 있는지
    _bOnTheGround = false;

    // 캐릭터가 떨어지는 속도와 가속도
    _fallingSpeed = 0;
    _fallingAcceleration = 0;


    update(time) {
        time *= 0.001; // second unit
        
        this._fps.update();
        
        if(this._mixer){    // 믹서 유효성 검사
            const deltaTime = time - this._previousTime;

            // deltaTime = 이전 프레임과 현재 프레임과의 시간 차이
            this._mixer.update(deltaTime);

            // 실제 카메라 각도와 캐릭터가 보는 각도를 참고하여 각도 조정
            const angleCameraDirectionAxisY = Math.atan2(
                (this._camera.position.x - this._model.position.x),
                (this._camera.position.z - this._model.position.z)
            ) + Math.PI;

            // 캐릭터 회전을 위한 Quarternion
            const rotateQuaternion = new THREE.Quaternion();
            rotateQuaternion.setFromAxisAngle(
                new THREE.Vector3(0,1,0),
                angleCameraDirectionAxisY + this._directionOffset()
            )

            // Quarternion을 이용한 캐릭터 회전 장치
            this._model.quaternion.rotateTowards(rotateQuaternion, THREE.MathUtils.degToRad(5));

            const walkDirection = new THREE.Vector3();
            this._camera.getWorldDirection(walkDirection);

            // 캐릭터가 있는 높이
            // walkDirection.y = 0;
            walkDirection.y = this._bOnTheGround ? 0: -1;
            walkDirection.normalize();

            walkDirection.applyAxisAngle(new THREE.Vector3(0,1,0), this._directionOffset());
            
            // 캐릭터가 달리는 속도와 가속도
            if(this._speed < this._maxSpeed) {
                this._speed += this._acceleration;
            }else {
                this._speed -= this._acceleration*2;
            }

            // 캐릭터의 이동방향과 떨어지는 속도를 이용한 속도 벡터 구하기
            const velocity = new THREE.Vector3(
                walkDirection.x * this._speed,
                walkDirection.y * this._fallingSpeed,
                walkDirection.z * this._speed
            );

            const  deltaPosition = velocity.clone().multiplyScalar(deltaTime);

            // 캐릭터가 떨어지는 속도와 가속도
            if(!this._bOnTheGround){
                this._fallingAcceleration +=1;
                this._fallingSpeed += Math.pow(this._fallingAcceleration, 2);
            }else{
                this._fallingAcceleration = 0;
                this._fallingSpeed =0;
            }

            // 캐릭터가 이동할 거리 계산 - 캡슐화 전
            // const moveX = walkDirection.x * (this._speed * deltaTime);
            // const moveZ = walkDirection.z * (this._speed * deltaTime);

            // this._model.position.x += moveX;
            // this._model.position.z += moveZ;

            this._model._capsule.translate(deltaPosition);

            const result = this._worldOctree.capsuleIntersect(this._model._capsule);
            if(result){ // 충돌한 경우
                this._model._capsule.translate(result.normal.multiplyScalar(result.depth));
                this._bOnTheGround = true;
            }else{      // 충돌하지 않은 경우
                this._bOnTheGround = false;

            }

            const previousPosition = this._model.position.clone();
            
            // 캡슐 위치 얻기
            const capsuleHeight = this._model._capsule.end.y - this._model._capsule.start.y
                + this._model._capsule.radius*2;

            // 모델의 위치 캡슐 위치에 맞춰주기
            this._model.position.set(
                this._model._capsule.start.x,
                this._model._capsule.start.y - this._model._capsule.radius + capsuleHeight/2,
                this._model._capsule.start.z
            )

            // 카메라 위치설정 - 캡슐화 전
            // this._camera.position.x += moveX;
            // this._camera.position.z += moveZ;

            // 카메라 위치 설정
            this._camera.position.x -= previousPosition.x - this._model.position.x;
            this._camera.position.z -= previousPosition.z - this._model.position.z;

            this._controls.target.set(
                this._model.position.x,
                this._model.position.y,
                this._model.position.z,
            )

        }

        this._previousTime = time;
        this._controls.update();

        if(this._boxHelper){
            this._boxHelper.update();
        }

    }

    render(time) {
        this._renderer.render(this._scene, this._camera);   
        this.update(time);

        requestAnimationFrame(this.render.bind(this));
    }

    resize() {
        const width = this._divContainer.clientWidth;
        const height = this._divContainer.clientHeight;

        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();
        
        this._renderer.setSize(width, height);
    }
}

window.onload = function () {
    new App();
}