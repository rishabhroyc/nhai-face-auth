# NHAI Face Authentication System

An offline-first facial recognition system for highway worker attendance management, designed for the NHAI Hackathon 7.0.

## Features

- **Offline Face Recognition**: Complete on-device face recognition using MobileFaceNet
- **Liveness Detection**: Challenge-based liveness detection (blink, smile, head turns)
- **Attendance Marking**: GPS-based geofence validation with offline storage
- **Offline Sync**: Queue-based synchronization for offline-first operation
- **Multi-Platform**: Android and iOS support

## Architecture

The system uses:
- React Native 0.73.2
- TypeScript for type safety
- React Native Vision Camera for camera access
- MediaPipe Face Landmarker for face detection
- MobileFaceNet TFLite for face embeddings
- SQLite for local storage
- Zustand for state management

## Installation

### Prerequisites

- Node.js 18+
- React Native development environment
- Android Studio (for Android)
- Xcode (for iOS, Mac required)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd nhai-face-auth

# Install dependencies
npm install

# iOS only - install pods
cd ios && pod install && cd ..

# Run Android
npm run android

# Run iOS
npm run ios

# Build Android APK
cd android && ./gradlew assembleRelease