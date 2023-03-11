import * as THREE from "../build/three.module.js";

class App{

    constructor() {

        const divContainer = document.querySelector("#webgl-container");

        this._divContainer = divContainer;


        const renderer = new THREE.WebGLRenderer({antialias:true});

        renderer.setPixelRatio(window.devicePixelRatio);

        divContainer.appendChild(renderer.domElement);

        this._renderer = renderer; 


        const scene = new THREE.Scene();

        this._scene = scene;


        this._setupCamera();
        this._setupLight();
        this._setupModel();

        window.onresize = this.resize.bind(this);
        this.resize();


        requestAnimationFrame(this.render.bind(this));
    }


    _setupCamera(){

        const width = this._divContainer.clientWidth;
        const height = this._divContainer.clientHeight;
        // 카메라 객체 생성
        const camera = new THREE.PerspectiveCamera(
            75,
            width / height,
            0.1,
            100
        );
        camera.position.z = 2;
        this._camera = camera;
    }
    _setupLight(){
        const color = 0xffffff;
        const intensity = 1;
        const light = new THREE.DirectionalLight(color,intensity);
        light.position.set(-1, 2, 4);
        this._scene.add(light);
    }
    // 파란색 정육면체 mesh 생성
    _setupModel(){
        // BoxGeometry 정육면체의 형상
        const geometry = new THREE.BoxGeometry(1,1,1);
        // 파란색 계열의 재질 생성
        const Material = new THREE.MeshPhongMaterial({color: 0x44a88});

        const cube = new THREE.Mesh(geometry,Material);

        // scene객체의 구성요소로 cube추가
        this._scene.add(cube)
        // 다른 메서드에서 참조할 수 있도록 field로 정의
        this._cube = cube;
    }

    // 창의 크기가 변경될때 발생하는 이벤트
    resize(){
        // 위에서 divContainer로 정의한(#webgl-container div) div의 크기 얻어오기
        const width = this._divContainer.clientWidth;
        const height = this._divContainer.clientHeight;

        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();

        this._renderer.setSize(width,height);
    }
    
    // time : 렌더링이 처음 시작된 이후 경과된 시간(ms 단위)
    // time은 requestAnimationFrame 함수가 render함수에 전달해준 값이다
    render(time){
        // 랜더링 시에 scene을 카메라의 시점으로 렌더링하도록 만드는 장치
        this._renderer.render(this._scene, this._camera);
        // 속성값을 변경시켜 애니메이션 효과를 만드는 장치
        this.update(time);
        requestAnimationFrame(this.render.bind(this));
    }
    // render에서 전달받은 time을 사용하여 애니메이션 효과를 만드는 장치
    update(time){
        time *= 0.001;  // 알아보기 쉽게 ms단위를 초단위로 변경
        this._cube.rotation.x = time;
        this._cube.rotation.y = time;
    }

}

window.onload = function(){
    new App();
}




