import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import {
  Camera, X, RotateCw, ZoomIn, ZoomOut,
  RotateCcw, AlertCircle, Box, SwitchCamera, Check
} from 'lucide-react';
import { api } from '../services/api';
import { constructIndustryModel } from './Viewer3D';

export default function ARModal({ model, onClose }) {
  const safeModel = model || {};
  const mountRef = useRef(null);
  const videoRef = useRef(null);

  // Camera & Device States
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [modelLoading, setModelLoading] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const autoRotateRef = useRef(true);
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [snapshotTaken, setSnapshotTaken] = useState(false);
  const [placementToast, setPlacementToast] = useState(false);

  // Constants: Floor Plane Height
  const FLOOR_Y = -1.6;

  // Three.js References
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const modelGroupRef = useRef(null);
  const shadowPlaneRef = useRef(null);
  const reticleRef = useRef(null);
  const modelPosRef = useRef({ x: 0, z: 0 });
  const targetModelPosRef = useRef({ x: 0, z: 0 });
  const tapStartRef = useRef({ x: 0, y: 0, time: 0 });
  const autoLaunchedRef = useRef(false);

  // Camera Orbit & Touch State (default pitched downward looking at floor)
  const controlsRef = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    theta: 0.5,
    phi: 1.05,
    targetTheta: 0.5,
    targetPhi: 1.05,
    distance: 3.8,
    targetDistance: 3.8,
    modelScale: 1
  });

  const touchStateRef = useRef({
    initialPinchDist: 0,
    initialScale: 1
  });

  // Keep auto-rotate ref synced
  useEffect(() => {
    autoRotateRef.current = autoRotate;
    if (!autoRotate && controlsRef.current) {
      controlsRef.current.targetTheta = controlsRef.current.theta;
    }
  }, [autoRotate]);

  // Keep scale synced to 3D group
  useEffect(() => {
    controlsRef.current.modelScale = scale;
    if (modelGroupRef.current) {
      modelGroupRef.current.scale.setScalar(scale);
    }
  }, [scale]);

  // Model file URLs & Intent links
  const modelFileUrl = safeModel.web_ready_file_url || safeModel.file_url || (safeModel.versions && safeModel.versions[0]?.file_path) || '';
  const absoluteModelUrl = modelFileUrl.startsWith('http')
    ? modelFileUrl
    : `${window.location.origin}${modelFileUrl.startsWith('/') ? '' : '/'}${modelFileUrl}`;
  const cleanPath = absoluteModelUrl.split('?')[0].toLowerCase();
  const isGlb = cleanPath.endsWith('.glb') || cleanPath.endsWith('.gltf') || cleanPath.includes('/uploads/models/');
  const androidSceneViewerUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(absoluteModelUrl)}&mode=ar_preferred&title=${encodeURIComponent(safeModel.title || '3D Model')}&resizable=true#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;end;`;
  const usdzUrl = safeModel.usdz_file_url || absoluteModelUrl.replace(/\.glb$/i, '.usdz');

  // Detect Mobile & OS for Native WebAR fallback links & Auto-launch SceneViewer on Android
  useEffect(() => {
    const ua = navigator.userAgent || '';
    const mobileCheck = /Android|iPhone|iPad|iPod/i.test(ua);
    const iosCheck = /iPhone|iPad|iPod/i.test(ua);
    const androidCheck = /Android/i.test(ua);

    setIsMobile(mobileCheck);
    setIsIOS(iosCheck);
    setIsAndroid(androidCheck);

    // Auto-launch Google SceneViewer on Android so it directly places the model on the physical floor
    if (androidCheck && isGlb && !autoLaunchedRef.current) {
      autoLaunchedRef.current = true;
      const timer = setTimeout(() => {
        try {
          window.location.href = androidSceneViewerUrl;
        } catch (e) {
          console.warn('[SceneViewer Auto-launch Error]:', e);
        }
      }, 350);
      return () => clearTimeout(timer);
    }

    // Record AR launch event in backend
    if (safeModel?.id) {
      api.launchAR(safeModel.id, {
        deviceType: mobileCheck ? (iosCheck ? 'iOS Mobile' : 'Android Mobile') : 'Desktop',
        browser: ua.includes('Safari') && !ua.includes('Chrome') ? 'Safari' : 'Chrome',
        os: navigator.platform
      }).catch(console.warn);
    }
  }, [safeModel, isGlb, androidSceneViewerUrl]);

  // Camera Management - Automatically launched on mount!
  const startCamera = async (mode = facingMode) => {
    setCameraLoading(true);
    setCameraError(null);

    // Stop existing active tracks if switching camera
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(t => t.stop());
        videoRef.current.srcObject = null;
      } catch (e) {
        console.warn('Error clearing previous camera stream:', e);
      }
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access requires HTTPS or is not supported by this browser.');
      }

      // Constraints prioritizing high-res environment (back) camera
      const constraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.warn('[Camera Stream Error]:', err);
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      const msg = isDenied
        ? 'Camera permission denied. Allow camera access in browser settings.'
        : (err.message || 'Unable to start camera.');
      setCameraError(msg);
      setCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      } catch (e) {
        console.warn('Error stopping camera:', e);
      }
    }
    setCameraActive(false);
  };

  const switchCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Launch camera immediately when mounted
  useEffect(() => {
    startCamera('environment');
    return () => {
      stopCamera();
    };
  }, []);

  // Three.js Scene Setup & 3D Model Loading
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let isDisposed = false;
    let animationFrameId;

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Perspective Camera with natural AR field of view
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // 3. Renderer with transparent alpha background for AR camera overlay
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true // Required for snapshot capture!
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mount.replaceChildren(renderer.domElement);

    // 4. Photorealistic Studio & Natural Environment Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunLight.position.set(4, 7, 5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 25;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xc7d2fe, 1.0);
    fillLight.position.set(-4, 3, -4);
    scene.add(fillLight);

    const bottomFillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    bottomFillLight.position.set(0, -3, 0);
    scene.add(bottomFillLight);

    // 5. Floor Contact Shadow & AR Ground Reticle
    const shadowGeo = new THREE.PlaneGeometry(3.6, 3.6);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d');
    const grad = sCtx.createRadialGradient(64, 64, 12, 64, 64, 64);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.75)');
    grad.addColorStop(0.4, 'rgba(15, 23, 42, 0.35)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, FLOOR_Y + 0.005, 0);
    scene.add(shadowPlane);
    shadowPlaneRef.current = shadowPlane;

    // AR Floor Target Reticle (Indicates locked floor surface)
    const reticleGroup = new THREE.Group();
    const reticleGeo = new THREE.RingGeometry(0.9, 1.0, 32);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const reticleMesh = new THREE.Mesh(reticleGeo, reticleMat);
    reticleMesh.rotation.x = -Math.PI / 2;
    reticleGroup.add(reticleMesh);

    // 4 Corner ticks on floor reticle
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const tickGeo = new THREE.PlaneGeometry(0.06, 0.22);
      const tickMat = new THREE.MeshBasicMaterial({
        color: 0xc4b5fd,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const tick = new THREE.Mesh(tickGeo, tickMat);
      tick.rotation.x = -Math.PI / 2;
      tick.position.set(Math.cos(angle) * 1.1, 0, Math.sin(angle) * 1.1);
      tick.rotation.z = -angle;
      reticleGroup.add(tick);
    }
    reticleGroup.position.set(0, FLOOR_Y + 0.003, 0);
    scene.add(reticleGroup);
    reticleRef.current = reticleGroup;

    // 6. Model Root Group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Helper: Normalize & place 3D model directly on the floor plane
    const fitModelToScene = (rootObj) => {
      rootObj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(rootObj);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      const maxDim = Math.max(size.x, size.y, size.z);
      const targetSize = 2.0;
      const scaleFactor = maxDim > 0.001 ? targetSize / maxDim : 1;

      rootObj.scale.setScalar(scaleFactor);
      rootObj.position.x = -center.x * scaleFactor;
      rootObj.position.y = -center.y * scaleFactor;
      rootObj.position.z = -center.z * scaleFactor;

      rootObj.updateMatrixWorld(true);
      const scaledBox = new THREE.Box3().setFromObject(rootObj);
      // Ground the model firmly onto the floor plane
      rootObj.position.y += (FLOOR_Y - scaledBox.min.y);

      // Enable shadows and double-sided materials
      rootObj.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          if (node.material) {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach((m) => {
              m.side = THREE.DoubleSide;
              m.needsUpdate = true;
            });
          }
        }
      });

      modelGroup.add(rootObj);
      if (!isDisposed) setModelLoading(false);
    };

    // Helper: Procedural CAD 3D representation
    const fallbackToProcedural = () => {
      if (isDisposed) return;
      const proceduralGroup = new THREE.Group();
      constructIndustryModel(
        proceduralGroup,
        safeModel.category_name || safeModel.business_industry || '',
        safeModel.title || ''
      );
      fitModelToScene(proceduralGroup);
    };

    // 7. Load real model or fallback
    const resolvedUrl = safeModel.web_ready_file_url || safeModel.file_url || null;

    if (resolvedUrl) {
      const cleanPath = resolvedUrl.split('?')[0].toLowerCase();

      if (cleanPath.endsWith('.glb') || cleanPath.endsWith('.gltf')) {
        const loader = new GLTFLoader();
        loader.load(
          resolvedUrl,
          (gltf) => {
            if (isDisposed) return;
            fitModelToScene(gltf.scene);
          },
          undefined,
          (err) => {
            console.warn('[ARModal GLTF Load Fallback]:', err);
            fallbackToProcedural();
          }
        );
      } else if (cleanPath.endsWith('.obj')) {
        const loader = new OBJLoader();
        loader.load(
          resolvedUrl,
          (obj) => {
            if (isDisposed) return;
            fitModelToScene(obj);
          },
          undefined,
          () => fallbackToProcedural()
        );
      } else if (cleanPath.endsWith('.stl')) {
        const loader = new STLLoader();
        loader.load(
          resolvedUrl,
          (geom) => {
            if (isDisposed) return;
            const mat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, metalness: 0.6, roughness: 0.3 });
            const mesh = new THREE.Mesh(geom, mat);
            fitModelToScene(mesh);
          },
          undefined,
          () => fallbackToProcedural()
        );
      } else {
        fallbackToProcedural();
      }
    } else {
      fallbackToProcedural();
    }

    // 8. Animation & Render Loop (Grounded Floor Perspective)
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth model position interpolation when moved on floor
      modelPosRef.current.x += (targetModelPosRef.current.x - modelPosRef.current.x) * 0.15;
      modelPosRef.current.z += (targetModelPosRef.current.z - modelPosRef.current.z) * 0.15;

      if (modelGroupRef.current) {
        modelGroupRef.current.position.x = modelPosRef.current.x;
        modelGroupRef.current.position.z = modelPosRef.current.z;
      }
      if (shadowPlaneRef.current) {
        shadowPlaneRef.current.position.x = modelPosRef.current.x;
        shadowPlaneRef.current.position.z = modelPosRef.current.z;
      }
      if (reticleRef.current) {
        reticleRef.current.position.x = modelPosRef.current.x;
        reticleRef.current.position.z = modelPosRef.current.z;
        reticleRef.current.rotation.y += 0.012;
      }

      const ctrl = controlsRef.current;

      // Auto-rotation when enabled and user not interacting
      if (autoRotateRef.current && !ctrl.isDragging) {
        ctrl.targetTheta += 0.008;
      }

      // Smooth damping interpolation
      ctrl.theta += (ctrl.targetTheta - ctrl.theta) * 0.1;
      ctrl.phi += (ctrl.targetPhi - ctrl.phi) * 0.1;
      ctrl.distance += (ctrl.targetDistance - ctrl.distance) * 0.1;

      // Clamp vertical phi so camera stays above the floor looking down
      ctrl.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, ctrl.phi));

      // Spherical coordinate position relative to the grounded model
      const x = ctrl.distance * Math.sin(ctrl.phi) * Math.sin(ctrl.theta) + modelPosRef.current.x;
      const y = ctrl.distance * Math.cos(ctrl.phi) + (FLOOR_Y + 1.8);
      const z = ctrl.distance * Math.sin(ctrl.phi) * Math.cos(ctrl.theta) + modelPosRef.current.z;

      camera.position.set(x, y, z);
      camera.lookAt(modelPosRef.current.x, FLOOR_Y + 0.6, modelPosRef.current.z);

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Observer for robust responsive dimensions
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });

    resizeObserver.observe(mount);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.dispose();
      if (mount && renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [safeModel]);

  // Touch Distance Helper for Multi-Touch Pinch Zoom
  const getTouchDist = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Tap-to-Place on Floor: Raycasts to the virtual ground plane
  const handleFloorTap = (clientX, clientY) => {
    const mount = mountRef.current;
    const cam = cameraRef.current;
    if (!mount || !cam) return;
    const rect = mount.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);

    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLOOR_Y);
    const targetPoint = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(floorPlane, targetPoint);

    if (hit) {
      const dist = Math.hypot(targetPoint.x, targetPoint.z);
      if (dist <= 4.8) {
        targetModelPosRef.current.x = targetPoint.x;
        targetModelPosRef.current.z = targetPoint.z;
        setPlacementToast(true);
        setTimeout(() => setPlacementToast(false), 2000);
      }
    }
  };

  // Touch Events (1-finger orbit, 2-finger pinch zoom, tap-to-place)
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      touchStateRef.current.initialPinchDist = getTouchDist(e.touches);
      touchStateRef.current.initialScale = scale;
      controlsRef.current.isDragging = false;
    } else if (e.touches.length === 1) {
      controlsRef.current.isDragging = true;
      controlsRef.current.prevX = e.touches[0].clientX;
      controlsRef.current.prevY = e.touches[0].clientY;
      tapStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      const dist = getTouchDist(e.touches);
      if (touchStateRef.current.initialPinchDist > 0) {
        const factor = dist / touchStateRef.current.initialPinchDist;
        const newScale = Math.min(3.0, Math.max(0.3, Number((touchStateRef.current.initialScale * factor).toFixed(2))));
        setScale(newScale);
      }
    } else if (e.touches.length === 1 && controlsRef.current.isDragging) {
      const curX = e.touches[0].clientX;
      const curY = e.touches[0].clientY;
      const deltaX = curX - controlsRef.current.prevX;
      const deltaY = curY - controlsRef.current.prevY;
      controlsRef.current.prevX = curX;
      controlsRef.current.prevY = curY;
      controlsRef.current.targetTheta -= deltaX * 0.007;
      controlsRef.current.targetPhi -= deltaY * 0.007;
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      const dx = Math.abs(controlsRef.current.prevX - tapStartRef.current.x);
      const dy = Math.abs(controlsRef.current.prevY - tapStartRef.current.y);
      const dt = Date.now() - tapStartRef.current.time;
      if (dx < 12 && dy < 12 && dt < 400) {
        // Single tap detected: Place / move model on floor!
        handleFloorTap(tapStartRef.current.x, tapStartRef.current.y);
      }
      controlsRef.current.isDragging = false;
      touchStateRef.current.initialPinchDist = 0;
    } else if (e.touches.length === 1) {
      controlsRef.current.isDragging = true;
      controlsRef.current.prevX = e.touches[0].clientX;
      controlsRef.current.prevY = e.touches[0].clientY;
      touchStateRef.current.initialPinchDist = 0;
    }
  };

  // Desktop Pointer Events
  const handlePointerDown = (e) => {
    if (e.pointerType === 'touch') return; // Handled by touch events
    controlsRef.current.isDragging = true;
    controlsRef.current.prevX = e.clientX;
    controlsRef.current.prevY = e.clientY;
    tapStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now()
    };
  };

  const handlePointerMove = (e) => {
    if (e.pointerType === 'touch') return;
    const ctrl = controlsRef.current;
    if (!ctrl.isDragging) return;

    const curX = e.clientX;
    const curY = e.clientY;
    const deltaX = curX - ctrl.prevX;
    const deltaY = curY - ctrl.prevY;
    ctrl.prevX = curX;
    ctrl.prevY = curY;

    ctrl.targetTheta -= deltaX * 0.007;
    ctrl.targetPhi -= deltaY * 0.007;
  };

  const handlePointerUp = (e) => {
    if (e.pointerType === 'touch') return;
    const dx = Math.abs(e.clientX - tapStartRef.current.x);
    const dy = Math.abs(e.clientY - tapStartRef.current.y);
    const dt = Date.now() - tapStartRef.current.time;
    if (dx < 10 && dy < 10 && dt < 400) {
      handleFloorTap(e.clientX, e.clientY);
    }
    controlsRef.current.isDragging = false;
  };

  // Close AR Mode and Return to Details
  const handleClose = () => {
    stopCamera();
    onClose();
  };

  // Reset Orbit & Scale to floor center
  const handleResetOrbit = () => {
    controlsRef.current.targetTheta = 0.5;
    controlsRef.current.targetPhi = 1.05;
    controlsRef.current.targetDistance = 3.8;
    targetModelPosRef.current.x = 0;
    targetModelPosRef.current.z = 0;
    setScale(1);
    setAutoRotate(true);
  };

  // Snapshot Capture: Combines Live Camera Stream + 3D Model WebGL Canvas
  const handleSnapshot = () => {
    try {
      const video = videoRef.current;
      const renderer = rendererRef.current;
      if (!renderer) return;

      const canvas = document.createElement('canvas');
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // 1. Draw video background if active
      if (cameraActive && video && video.videoWidth > 0) {
        const vRatio = video.videoWidth / video.videoHeight;
        const cRatio = w / h;
        let dw, dh, dx, dy;
        if (vRatio > cRatio) {
          dh = h;
          dw = h * vRatio;
          dx = (w - dw) / 2;
          dy = 0;
        } else {
          dw = w;
          dh = w / vRatio;
          dx = 0;
          dy = (h - dh) / 2;
        }
        ctx.drawImage(video, dx, dy, dw, dh);
      } else {
        const grad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h));
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Overlay 3D WebGL Canvas
      ctx.drawImage(renderer.domElement, 0, 0, w, h);

      // 3. Watermark badge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.font = '600 13px Inter, sans-serif';
      ctx.fillText(`${safeModel.title || '3D Asset'} • ModelAR WebAR`, 20, h - 24);

      // 4. Download file
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `webar-capture-${safeModel.title ? safeModel.title.replace(/[^a-z0-9]/gi, '_') : 'model'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setSnapshotTaken(true);
      setTimeout(() => setSnapshotTaken(false), 2200);
    } catch (err) {
      console.warn('Snapshot error:', err);
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        background: cameraActive ? '#000000' : 'radial-gradient(circle at 50% 40%, #1e1b4b 0%, #0f172a 75%, #020617 100%)',
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'none'
      }}
    >
      {/* 1. Live Camera Feed (Full-Screen Underneath 3D WebGL Canvas) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: cameraActive ? 'block' : 'none',
          zIndex: 1
        }}
      />

      {/* 2. AR Perspective Ground Grid Floor (Visible when camera is starting or denied) */}
      {!cameraActive && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 1,
            background: 'radial-gradient(circle at 50% 65%, rgba(139, 92, 246, 0.16) 0%, transparent 65%)'
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: '8%',
              left: '5%',
              right: '5%',
              height: '180px',
              borderBottom: '2px solid rgba(139, 92, 246, 0.35)',
              borderRadius: '50%',
              boxShadow: '0 0 50px rgba(139, 92, 246, 0.3)',
              transform: 'rotateX(75deg)'
            }}
          />
        </div>
      )}

      {/* 3. Three.js 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 2,
          cursor: 'grab'
        }}
      />

      {/* 4. Top Floating Bar */}
      <div
        style={{
          position: 'absolute',
          top: 'env(safe-area-inset-top, 16px)',
          left: '16px',
          right: '16px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          marginTop: '12px'
        }}
      >
        {/* Left: Model Name & Live AR Camera Badge */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.78)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            padding: '7px 14px',
            borderRadius: '30px',
            color: '#ffffff',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
            maxWidth: 'calc(100vw - 150px)'
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: cameraActive ? '#10b981' : '#f59e0b',
              boxShadow: `0 0 8px ${cameraActive ? '#10b981' : '#f59e0b'}`,
              flexShrink: 0
            }}
          />
          <span
            style={{
              fontSize: '0.84rem',
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {safeModel.title || '3D Model'}
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              color: cameraActive ? '#6ee7b7' : '#fde68a',
              fontWeight: 500,
              whiteSpace: 'nowrap'
            }}
          >
            {cameraActive ? 'AR Live' : 'AR Studio'}
          </span>
        </div>

        {/* Center: Native Floor Surface AR (iOS QuickLook / Android SceneViewer) */}
        {isMobile && (isIOS ? (
          <a
            rel="ar"
            href={usdzUrl}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(124, 58, 237, 0.95))',
              backdropFilter: 'blur(12px)',
              color: '#ffffff',
              padding: '7px 14px',
              borderRadius: '30px',
              fontSize: '0.78rem',
              fontWeight: 700,
              textDecoration: 'none',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              boxShadow: '0 4px 16px rgba(139, 92, 246, 0.45)',
              whiteSpace: 'nowrap',
              animation: 'pulseGlow 2.5s infinite'
            }}
          >
            <Box size={15} />
            <span>Place on Floor</span>
          </a>
        ) : isAndroid ? (
          <a
            href={androidSceneViewerUrl}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(124, 58, 237, 0.95))',
              backdropFilter: 'blur(12px)',
              color: '#ffffff',
              padding: '7px 14px',
              borderRadius: '30px',
              fontSize: '0.78rem',
              fontWeight: 700,
              textDecoration: 'none',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              boxShadow: '0 4px 16px rgba(139, 92, 246, 0.45)',
              whiteSpace: 'nowrap',
              animation: 'pulseGlow 2.5s infinite'
            }}
          >
            <Box size={15} />
            <span>Place on Floor</span>
          </a>
        ) : null)}

        {/* Right: Close Button */}
        <button
          onClick={handleClose}
          style={{
            pointerEvents: 'auto',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(15, 23, 42, 0.78)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
            flexShrink: 0
          }}
          title="Exit AR View"
        >
          <X size={20} />
        </button>
      </div>

      {/* Floor Tracking & Tap Guidance Pill */}
      {cameraActive && (
        <div
          style={{
            position: 'absolute',
            top: '76px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(12px)',
            color: '#e2e8f0',
            padding: '5px 14px',
            borderRadius: '20px',
            fontSize: '0.74rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ color: '#a78bfa', fontWeight: 700 }}>Floor Target:</span>
          <span>Tap anywhere to reposition model</span>
        </div>
      )}

      {/* Floor Placement Confirmation Toast */}
      {placementToast && (
        <div
          style={{
            position: 'absolute',
            top: '112px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            background: 'rgba(139, 92, 246, 0.95)',
            backdropFilter: 'blur(12px)',
            color: '#ffffff',
            padding: '7px 16px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 20px rgba(139, 92, 246, 0.45)'
          }}
        >
          <Check size={15} />
          <span>Model anchored to floor spot!</span>
        </div>
      )}

      {/* 5. Camera Loading Notice */}
      {cameraLoading && (
        <div
          style={{
            position: 'absolute',
            top: '74px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(12px)',
            color: '#ffffff',
            padding: '7px 16px',
            borderRadius: '24px',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div
            style={{
              width: '14px',
              height: '14px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: '#a78bfa',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <span>Opening camera...</span>
        </div>
      )}

      {/* 6. Camera Permission Notice / Fallback Banner */}
      {cameraError && (
        <div
          style={{
            position: 'absolute',
            top: '74px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            background: 'rgba(239, 68, 68, 0.92)',
            backdropFilter: 'blur(12px)',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '24px',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
            maxWidth: '92%'
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{cameraError}</span>
          <button
            onClick={() => startCamera()}
            style={{
              background: '#ffffff',
              color: '#ef4444',
              border: 'none',
              padding: '3px 10px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.72rem',
              cursor: 'pointer',
              marginLeft: '4px',
              flexShrink: 0
            }}
          >
            Retry Camera
          </button>
        </div>
      )}

      {/* 7. 3D Model Loading Spinner */}
      {modelLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(15, 23, 42, 0.82)',
            backdropFilter: 'blur(12px)',
            padding: '16px 24px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)'
          }}
        >
          <div
            style={{
              width: '30px',
              height: '30px',
              border: '3px solid rgba(255, 255, 255, 0.2)',
              borderTopColor: '#8b5cf6',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Loading 3D Geometry...</span>
        </div>
      )}

      {/* 8. Snapshot Flash & Confirmation Toast */}
      {snapshotTaken && (
        <div
          style={{
            position: 'absolute',
            top: '120px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            background: 'rgba(16, 185, 129, 0.95)',
            backdropFilter: 'blur(12px)',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '24px',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
          }}
        >
          <Check size={16} />
          <span>AR Snapshot saved to downloads!</span>
        </div>
      )}

      {/* 9. Floating Bottom HUD Toolbar */}
      <div
        style={{
          position: 'absolute',
          bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: '40px',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#ffffff',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
          maxWidth: '92%',
          overflowX: 'auto'
        }}
      >
        {/* Auto Rotate Toggle */}
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          style={{
            color: autoRotate ? '#93c5fd' : '#94a3b8',
            background: autoRotate ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
            border: 'none',
            padding: '8px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          title={autoRotate ? 'Pause Rotation' : 'Auto-Rotate Model'}
        >
          <RotateCw size={17} />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => setScale(s => Math.max(0.3, Number((s - 0.15).toFixed(2))))}
          style={{
            color: '#ffffff',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Scale Down"
        >
          <ZoomOut size={17} />
        </button>

        {/* Current Scale Badge */}
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            minWidth: '42px',
            textAlign: 'center',
            color: '#f8fafc'
          }}
        >
          {Math.round(scale * 100)}%
        </span>

        {/* Zoom In */}
        <button
          onClick={() => setScale(s => Math.min(3.0, Number((s + 0.15).toFixed(2))))}
          style={{
            color: '#ffffff',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Scale Up"
        >
          <ZoomIn size={17} />
        </button>

        <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.2)' }} />

        {/* Reset Model Position & Scale */}
        <button
          onClick={handleResetOrbit}
          style={{
            color: '#ffffff',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.78rem'
          }}
          title="Reset Model Position & Scale"
        >
          <RotateCcw size={16} />
        </button>

        <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.2)' }} />

        {/* Switch Camera (Rear / Front) */}
        <button
          onClick={switchCameraFacing}
          disabled={cameraLoading}
          style={{
            color: '#ffffff',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Switch Camera (Back/Front)"
        >
          <SwitchCamera size={17} />
        </button>

        {/* Shutter Snapshot Button */}
        <button
          onClick={handleSnapshot}
          style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '20px',
            padding: '6px 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            fontWeight: 700,
            boxShadow: '0 4px 14px rgba(139, 92, 246, 0.45)'
          }}
          title="Take Photo Snapshot"
        >
          <Camera size={15} />
          <span>Capture</span>
        </button>
      </div>

      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 4px 18px rgba(139, 92, 246, 0.45); }
          50% { box-shadow: 0 4px 28px rgba(139, 92, 246, 0.85); transform: scale(1.02); }
        }
      `}</style>
    </div>,
    document.body
  );
}
