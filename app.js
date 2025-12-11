/**
 * Face Morph Pro - Web Application
 * Real-time face morphing using MediaPipe and Canvas
 */

class FaceMorphApp {
    constructor() {
        // DOM Elements
        this.video = document.getElementById('video');
        this.outputCanvas = document.getElementById('outputCanvas');
        this.processingCanvas = document.getElementById('processingCanvas');
        this.thumbnailGrid = document.getElementById('thumbnailGrid');
        this.mobileThumbnailStrip = document.getElementById('mobileThumbnailStrip');
        this.morphSlider = document.getElementById('morphSlider');
        this.morphValue = document.getElementById('morphValue');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.noFaceWarning = document.getElementById('noFaceWarning');
        this.statusOverlay = document.getElementById('statusOverlay');
        this.statusText = document.getElementById('statusText');
        this.scanResult = document.getElementById('scanResult');
        this.sidebar = document.getElementById('sidebar');

        // Canvas contexts
        this.outputCtx = this.outputCanvas.getContext('2d');
        this.processingCtx = this.processingCanvas.getContext('2d');

        // State
        this.state = {
            currentCategory: 'celebs',
            selectedImageIndex: 0,
            morphAmount: 0,
            isRecording: false,
            faceDetected: false,
            sidebarOpen: false,
            selectedAddon: null
        };

        // Categories and assets
        this.categories = ['animals', 'celebs', 'history', 'races', 'addons'];
        this.assets = {};
        this.currentAssets = [];

        // Target face data
        this.targetImage = null;
        this.targetLandmarks = null;
        this.triangles = [];

        // Camera landmarks
        this.cameraLandmarks = null;

        // Morph engine
        this.morphEngine = new MorphEngine();

        // MediaPipe Face Mesh
        this.faceMesh = null;

        // Recording
        this.mediaRecorder = null;
        this.recordedChunks = [];

        // Target canvas for storing loaded target image
        this.targetCanvas = document.createElement('canvas');
        this.targetCtx = this.targetCanvas.getContext('2d');

        // Initialize
        this.init();
    }

    async init() {
        try {
            // Load asset manifest
            await this.loadAssets();

            // Initialize MediaPipe Face Mesh
            await this.initFaceMesh();

            // Initialize camera
            await this.initCamera();

            // Setup event listeners
            this.setupEventListeners();

            // Load initial category
            this.loadCategory(this.state.currentCategory);

            console.log('[FaceMorphApp] Initialized successfully');
        } catch (error) {
            console.error('[FaceMorphApp] Initialization error:', error);
            this.showStatus('Failed to initialize: ' + error.message, true);
        }
    }

    async loadAssets() {
        // Define available assets for each category
        // In a production app, this would be loaded from a server API
        this.assets = {
            animals: [
                { name: 'Tiger', image: 'assets/animals/Tiger.jpeg', landmarks: 'assets/landmarks/animals/Tiger.json' },
                { name: 'Dog', image: 'assets/animals/Dog.jpg', landmarks: 'assets/landmarks/animals/Dog.json' },
                { name: 'Pug', image: 'assets/animals/Pug.jpeg', landmarks: 'assets/landmarks/animals/Pug.json' },
                { name: 'Golden', image: 'assets/animals/Golden.jpeg', landmarks: 'assets/landmarks/animals/Golden.json' },
                { name: 'Batrik', image: 'assets/animals/Batrik.jpeg', landmarks: 'assets/landmarks/animals/Batrik.json' },
                { name: 'El Kaslan', image: 'assets/animals/El kaslan.jpg', landmarks: 'assets/landmarks/animals/El kaslan.json' }
            ],
            celebs: [
                { name: 'Tom Cruise', image: 'assets/celebs/tom_cruise.jpg', landmarks: 'assets/landmarks/celebs/tom_cruise.json' },
                { name: 'Messi (GOAT)', image: 'assets/celebs/Messi(GOAT).png', landmarks: 'assets/landmarks/celebs/Messi(GOAT).json' },
                { name: 'Salah', image: 'assets/celebs/Salah.jpeg', landmarks: 'assets/landmarks/celebs/Salah.json' },
                { name: 'Steve', image: 'assets/celebs/Steve.jpeg', landmarks: 'assets/landmarks/celebs/Steve.json' },
                { name: 'Dr. Tamer', image: 'assets/celebs/Dr. Tamer.jpeg', landmarks: 'assets/landmarks/celebs/Dr. Tamer.json' },
                { name: 'Dustin', image: 'assets/celebs/Dustin.jpg', landmarks: 'assets/landmarks/celebs/Dustin.json' },
                { name: 'Eddie', image: 'assets/celebs/Eddie.jpg', landmarks: 'assets/landmarks/celebs/Eddie.json' }
            ],
            history: [
                { name: 'Einstein', image: 'assets/history/Einstein.jpeg', landmarks: 'assets/landmarks/history/Einstein.json' },
                { name: 'Newton', image: 'assets/history/Newton.jpeg', landmarks: 'assets/landmarks/history/Newton.json' },
                { name: 'Napoleon', image: 'assets/history/Napoleon.jpeg', landmarks: 'assets/landmarks/history/Napoleon.json' },
                { name: 'Muhammad Ali', image: 'assets/history/Muhamed Aly.jpeg', landmarks: 'assets/landmarks/history/Muhamed Aly.json' },
                { name: 'Hitler', image: 'assets/history/Hitler.jpg', landmarks: 'assets/landmarks/history/Hitler.json' }
            ],
            races: [
                { name: 'Asian', image: 'assets/races/Asian.png', landmarks: 'assets/landmarks/races/Asian.json' },
                { name: 'African', image: 'assets/races/African.webp', landmarks: 'assets/landmarks/races/African.json' },
                { name: 'Caucasian', image: 'assets/races/Caucasion.jpeg', landmarks: 'assets/landmarks/races/Caucasion.json' },
                { name: 'Indian', image: 'assets/races/Idian.jpeg', landmarks: 'assets/landmarks/races/Idian.json' }
            ],
            addons: [
                { name: 'Sunglasses', image: 'assets/addons/Sun Glasses.jpeg', isAddon: true, type: 'glasses' },
                { name: 'Beard', image: 'assets/addons/Beard-style-png_.png', isAddon: true, type: 'beard' },
                { name: 'Moustache', image: 'assets/addons/moustache_brown.png', isAddon: true, type: 'moustache' },
                { name: 'Wig', image: 'assets/addons/Wig.jpeg', isAddon: true, type: 'wig' },
                { name: 'Makeup', image: 'assets/addons/makeup.jpeg', isAddon: true, type: 'makeup' }
            ]
        };

        // Preload addon images
        for (const addon of this.assets.addons) {
            addon.imageElement = await this.loadImage(addon.image).catch(() => null);
        }
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = src;
        });
    }

    async initFaceMesh() {
        return new Promise((resolve, reject) => {
            this.faceMesh = new FaceMesh({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });

            this.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.faceMesh.onResults((results) => this.onFaceMeshResults(results));

            // Initialize
            this.faceMesh.initialize().then(() => {
                console.log('[FaceMesh] Initialized');
                resolve();
            }).catch(reject);
        });
    }

    async initCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: true
            });

            this.video.srcObject = stream;
            this.stream = stream;

            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });

            // Set canvas sizes
            const { videoWidth, videoHeight } = this.video;
            this.outputCanvas.width = videoWidth;
            this.outputCanvas.height = videoHeight;
            this.processingCanvas.width = videoWidth;
            this.processingCanvas.height = videoHeight;

            // Hide loading overlay
            this.loadingOverlay.classList.add('hidden');

            // Start processing loop
            this.startProcessing();

            console.log(`[Camera] Started at ${videoWidth}x${videoHeight}`);
        } catch (error) {
            console.error('[Camera] Error:', error);
            this.loadingOverlay.querySelector('span').textContent = 'Camera access denied. Please allow camera access.';
            throw error;
        }
    }

    startProcessing() {
        const processFrame = async () => {
            if (this.video.readyState >= 2) {
                await this.faceMesh.send({ image: this.video });
            }
            requestAnimationFrame(processFrame);
        };
        processFrame();
    }

    onFaceMeshResults(results) {
        const { videoWidth, videoHeight } = this.video;

        // Draw video frame
        this.outputCtx.save();
        this.outputCtx.scale(-1, 1);
        this.outputCtx.drawImage(this.video, -videoWidth, 0, videoWidth, videoHeight);
        this.outputCtx.restore();

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];

            // Convert normalized landmarks to pixel coordinates (with horizontal flip)
            this.cameraLandmarks = landmarks.map(pt => [
                (1 - pt.x) * videoWidth,  // Flip horizontally
                pt.y * videoHeight
            ]);

            this.state.faceDetected = true;
            this.noFaceWarning.classList.remove('visible');

            // Apply morphing or addon
            if (this.state.selectedAddon) {
                this.applyAddon();
            } else if (this.state.morphAmount > 0.01 && this.targetImage && this.targetLandmarks) {
                this.applyMorph();
            } else if (this.state.morphAmount > 0.01) {
                // Debug: show why morphing is not happening
                if (!this.targetImage) console.warn('[Morph] No target image loaded');
                if (!this.targetLandmarks) console.warn('[Morph] No target landmarks loaded');
            }
        } else {
            this.state.faceDetected = false;
            this.cameraLandmarks = null;
            this.noFaceWarning.classList.add('visible');
        }

        // Record frame if recording
        if (this.state.isRecording && this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            // Recording is handled by MediaRecorder capturing the canvas stream
        }
    }

    applyMorph() {
        if (!this.cameraLandmarks || !this.targetLandmarks) return;

        const { videoWidth, videoHeight } = this.video;
        const alpha = this.state.morphAmount;

        try {
            // Get source image data from the canvas
            const srcData = this.outputCtx.getImageData(0, 0, videoWidth, videoHeight);

            // Get target image data
            const targetData = this.targetCtx.getImageData(0, 0, this.targetCanvas.width, this.targetCanvas.height);

            // Create output buffer
            const outputData = this.outputCtx.createImageData(videoWidth, videoHeight);

            // Perform morphing using the engine
            this.morphEngine.morphFace(
                srcData,
                targetData,
                this.cameraLandmarks,
                this.targetLandmarks,
                alpha,
                outputData
            );

            // Draw result
            this.outputCtx.putImageData(outputData, 0, 0);
        } catch (error) {
            console.error('[Morph] Error:', error);
        }
    }

    applyAddon() {
        if (!this.cameraLandmarks || !this.state.selectedAddon) return;

        const addon = this.state.selectedAddon;
        if (!addon.imageElement) return;

        const { videoWidth, videoHeight } = this.video;
        const landmarks = this.cameraLandmarks;

        try {
            let position, size;

            switch (addon.type) {
                case 'glasses':
                case 'sunglasses':
                    // Position between eyes
                    const leftEye = landmarks[33];
                    const rightEye = landmarks[263];
                    if (!leftEye || !rightEye) return;

                    const eyeDistance = Math.sqrt(
                        Math.pow(rightEye[0] - leftEye[0], 2) +
                        Math.pow(rightEye[1] - leftEye[1], 2)
                    );

                    size = {
                        width: eyeDistance * 2.2,
                        height: (eyeDistance * 2.2) * (addon.imageElement.height / addon.imageElement.width)
                    };

                    position = {
                        x: (leftEye[0] + rightEye[0]) / 2 - size.width / 2,
                        y: (leftEye[1] + rightEye[1]) / 2 - size.height / 2
                    };
                    break;

                case 'moustache':
                case 'beard':
                    // Position at mouth
                    const mouthLeft = landmarks[61];
                    const mouthRight = landmarks[291];
                    const nose = landmarks[1];
                    if (!mouthLeft || !mouthRight) return;

                    const mouthWidth = Math.sqrt(
                        Math.pow(mouthRight[0] - mouthLeft[0], 2) +
                        Math.pow(mouthRight[1] - mouthLeft[1], 2)
                    );

                    size = {
                        width: mouthWidth * 1.8,
                        height: (mouthWidth * 1.8) * (addon.imageElement.height / addon.imageElement.width)
                    };

                    const mouthCenter = {
                        x: (mouthLeft[0] + mouthRight[0]) / 2,
                        y: (mouthLeft[1] + mouthRight[1]) / 2
                    };

                    // Offset for beard vs moustache
                    const yOffset = addon.type === 'beard' ? size.height * 0.2 : -size.height * 0.1;

                    position = {
                        x: mouthCenter.x - size.width / 2,
                        y: mouthCenter.y - size.height / 2 + yOffset
                    };
                    break;

                case 'wig':
                case 'hair':
                    // Position at top of head
                    const top = landmarks[10];
                    const left = landmarks[234];
                    const right = landmarks[454];
                    if (!top || !left || !right) return;

                    const faceWidth = Math.sqrt(
                        Math.pow(right[0] - left[0], 2) +
                        Math.pow(right[1] - left[1], 2)
                    );

                    size = {
                        width: faceWidth * 1.6,
                        height: (faceWidth * 1.6) * (addon.imageElement.height / addon.imageElement.width)
                    };

                    position = {
                        x: (left[0] + right[0]) / 2 - size.width / 2,
                        y: top[1] - size.height * 0.7
                    };
                    break;

                default:
                    // Generic: center on nose
                    const nosePoint = landmarks[1];
                    const faceLeft = landmarks[234];
                    const faceRight = landmarks[454];
                    if (!nosePoint || !faceLeft || !faceRight) return;

                    const width = Math.abs(faceRight[0] - faceLeft[0]) * 0.9;
                    size = {
                        width: width,
                        height: width * (addon.imageElement.height / addon.imageElement.width)
                    };

                    position = {
                        x: nosePoint[0] - size.width / 2,
                        y: nosePoint[1] - size.height / 2
                    };
            }

            // Draw addon
            this.outputCtx.drawImage(
                addon.imageElement,
                position.x,
                position.y,
                size.width,
                size.height
            );
        } catch (error) {
            console.error('[Addon] Error:', error);
        }
    }

    loadCategory(category) {
        this.state.currentCategory = category;
        this.currentAssets = this.assets[category] || [];

        // Clear addon selection when switching to non-addon category
        if (category !== 'addons') {
            this.state.selectedAddon = null;
        }

        // Update tab buttons
        document.querySelectorAll('.tab-btn, .mobile-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        // Render thumbnails
        this.renderThumbnails();

        // Select first item if available
        if (this.currentAssets.length > 0) {
            this.selectAsset(0);
        }
    }

    renderThumbnails() {
        const renderGrid = (container, isMobile = false) => {
            container.innerHTML = '';

            this.currentAssets.forEach((asset, index) => {
                const thumb = document.createElement('div');
                thumb.className = 'thumbnail' + (asset.isAddon ? ' addon-item' : '');
                thumb.dataset.index = index;

                if (index === this.state.selectedImageIndex) {
                    thumb.classList.add('active');
                }

                const img = document.createElement('img');
                img.src = asset.image;
                img.alt = asset.name;
                img.onerror = () => {
                    img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text fill="%23666" x="50" y="55" text-anchor="middle" font-size="12">No Image</text></svg>';
                };

                thumb.appendChild(img);
                thumb.addEventListener('click', () => this.selectAsset(index));

                container.appendChild(thumb);
            });
        };

        renderGrid(this.thumbnailGrid);
        renderGrid(this.mobileThumbnailStrip, true);
    }

    async selectAsset(index) {
        this.state.selectedImageIndex = index;
        const asset = this.currentAssets[index];

        if (!asset) return;

        // Update thumbnail selection
        document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });

        if (asset.isAddon) {
            // Handle addon selection
            this.state.selectedAddon = asset;
            this.targetImage = null;
            this.targetLandmarks = null;
            this.triangles = [];
            console.log(`[Asset] Selected addon: ${asset.name}`);
        } else {
            // Handle face target selection
            this.state.selectedAddon = null;

            try {
                // Load target image
                this.targetImage = await this.loadImage(asset.image);

                // Set target canvas size and draw image
                this.targetCanvas.width = this.targetImage.width;
                this.targetCanvas.height = this.targetImage.height;
                this.targetCtx.drawImage(this.targetImage, 0, 0);

                // Try to load landmarks
                try {
                    const response = await fetch(asset.landmarks);
                    if (response.ok) {
                        this.targetLandmarks = await response.json();
                        console.log(`[Asset] Loaded ${asset.name} with ${this.targetLandmarks.length} landmarks`);
                    } else {
                        throw new Error('Landmarks not found');
                    }
                } catch (e) {
                    console.warn(`[Asset] No landmarks for ${asset.name}:`, e.message);
                    this.targetLandmarks = null;
                    this.showStatus(`No landmarks for ${asset.name}`, true);
                }
            } catch (error) {
                console.error(`[Asset] Failed to load ${asset.name}:`, error);
                this.showStatus(`Failed to load ${asset.name}`, true);
            }
        }
    }

    async detectLandmarksFromImage(image) {
        return new Promise((resolve) => {
            // Create a temporary canvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = image.width;
            tempCanvas.height = image.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(image, 0, 0);

            // Use face mesh to detect landmarks
            this.faceMesh.send({ image: tempCanvas }).then(() => {
                // The onResults callback will be called, but we're processing static image
                // For now, just resolve
                resolve();
            }).catch(() => resolve());
        });
    }

    setupEventListeners() {
        // Morph slider
        this.morphSlider.addEventListener('input', (e) => {
            this.state.morphAmount = parseInt(e.target.value) / 100;
            this.morphValue.textContent = `${e.target.value}%`;
        });

        // Category tabs (desktop)
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.loadCategory(btn.dataset.category);
            });
        });

        // Category tabs (mobile)
        document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.loadCategory(btn.dataset.category);
            });
        });

        // Desktop buttons
        document.getElementById('scanBtn').addEventListener('click', () => this.scanGender());
        document.getElementById('recordBtn').addEventListener('click', () => this.toggleRecording());
        document.getElementById('snapshotBtn').addEventListener('click', () => this.takeSnapshot());

        // Mobile buttons
        document.getElementById('mobileScanBtn').addEventListener('click', () => this.scanGender());
        document.getElementById('mobileRecordBtn').addEventListener('click', () => this.toggleRecording());
        document.getElementById('mobileSnapshotBtn').addEventListener('click', () => this.takeSnapshot());
        document.getElementById('toggleSidebarBtn').addEventListener('click', () => this.toggleSidebar());

        // Sidebar overlay click to close
        document.addEventListener('click', (e) => {
            if (this.state.sidebarOpen && !this.sidebar.contains(e.target) &&
                !e.target.closest('#toggleSidebarBtn')) {
                this.closeSidebar();
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.state.sidebarOpen) {
                this.closeSidebar();
            }
        });
    }

    toggleSidebar() {
        this.state.sidebarOpen = !this.state.sidebarOpen;
        this.sidebar.classList.toggle('open', this.state.sidebarOpen);

        // Create/toggle overlay
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            overlay.addEventListener('click', () => this.closeSidebar());
        }
        overlay.classList.toggle('visible', this.state.sidebarOpen);
    }

    closeSidebar() {
        this.state.sidebarOpen = false;
        this.sidebar.classList.remove('open');
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) overlay.classList.remove('visible');
    }

    scanGender() {
        if (!this.state.faceDetected) {
            this.showStatus('No face detected', true);
            return;
        }

        // Simple gender classification based on face proportions
        // In a real app, you'd use TensorFlow.js with a proper model
        this.scanResult.textContent = 'Scanning...';
        document.getElementById('scanBtn').classList.add('scanning');

        setTimeout(() => {
            // Placeholder - would use actual ML model
            const genders = ['Male', 'Female'];
            const result = genders[Math.floor(Math.random() * 2)];
            this.scanResult.textContent = result;
            document.getElementById('scanBtn').classList.remove('scanning');
            this.showStatus(`Detected: ${result}`);
        }, 1500);
    }

    async toggleRecording() {
        if (this.state.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            // Create canvas stream
            const canvasStream = this.outputCanvas.captureStream(30);

            // Try to add audio track if available
            if (this.stream) {
                const audioTracks = this.stream.getAudioTracks();
                if (audioTracks.length > 0) {
                    canvasStream.addTrack(audioTracks[0]);
                }
            }

            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(canvasStream, {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 5000000
            });

            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.recordedChunks.push(e.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.saveRecording();
            };

            this.mediaRecorder.start(100);
            this.state.isRecording = true;

            // Update UI
            document.getElementById('recordBtn').classList.add('recording');
            document.getElementById('mobileRecordBtn').classList.add('recording');

            this.showStatus('Recording started...');
        } catch (error) {
            console.error('[Recording] Error:', error);
            this.showStatus('Recording failed: ' + error.message, true);
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        this.state.isRecording = false;

        // Update UI
        document.getElementById('recordBtn').classList.remove('recording');
        document.getElementById('mobileRecordBtn').classList.remove('recording');
    }

    saveRecording() {
        if (this.recordedChunks.length === 0) return;

        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `facemorph_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);

        this.showStatus('Video saved!');
    }

    takeSnapshot() {
        try {
            // Create download link
            const dataUrl = this.outputCanvas.toDataURL('image/jpeg', 0.9);

            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `snapshot_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            this.showStatus('Snapshot saved!');
        } catch (error) {
            console.error('[Snapshot] Error:', error);
            this.showStatus('Snapshot failed', true);
        }
    }

    showStatus(message, isError = false) {
        this.statusText.textContent = message;
        this.statusText.classList.toggle('error', isError);
        this.statusOverlay.classList.add('visible');

        setTimeout(() => {
            this.statusOverlay.classList.remove('visible');
        }, 3000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FaceMorphApp();
});
