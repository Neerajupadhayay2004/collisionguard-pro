
👉 **[https://collosion.netlify.app/](https://collosion.netlify.app/)**

# 🚦 Colosion – Smart Collision Avoidance & Rider Safety System

**Colosion** is a **full-stack, real-time, AI-powered safety and navigation platform** built to prevent road accidents and enhance rider safety.
It combines **real-time navigation, AI camera detection, collision warnings, offline support, native mobile features, and advanced maps** into one **fully responsive Progressive Web App (PWA)** that also runs as a **native Android & iOS app using Capacitor**.

🔗 **Live Demo:** [https://collosion.netlify.app/](https://collosion.netlify.app/)

---

## ✨ Key Highlights

* 🔴 **Real-time Collision Detection (AI-powered)**
* 🗺️ **Turn-by-turn Navigation with Danger Zones**
* 📡 **Live Vehicle Tracking & Traffic Updates**
* 🎙️ **Voice Commands (Offline Supported)**
* 📷 **Advanced Camera Detection (TensorFlow.js)**
* 📶 **Network Monitoring & Offline Mode**
* 📱 **Native Mobile App (Android & iOS)**
* 🚨 **Emergency SOS & Push Notifications**
* 🌙 **Night Mode & Driver Fatigue Detection**
* 📊 **Accident Heatmap & Safety Scoring**

---

## 🧠 Core Features

### 🚘 Real-Time Navigation

* OSRM-based free routing (no API key)
* Step-by-step turn navigation
* Route visualization on map
* Danger zones highlighted in **red**
* Safety score based on accident history

### 🗣️ Voice Commands (Web Speech API)

Works **without any API key**:

* `Start ride`
* `Stop ride`
* `Navigate to [place]`
* `Emergency / SOS`
* `What is my speed`
* `Safety check`
* `Clear route`

---

## 📷 AI Camera Collision Detection

* Real-time object & vehicle detection
* Distance estimation
* Multi-vehicle tracking
* Collision risk calculation
* Audio + haptic alerts on danger
* Uses **TensorFlow.js** for in-browser AI

---

## 📡 Live & Offline Intelligence

### 🌐 Network Monitoring

* Detects **Online / Offline** status using `@capacitor/network`
* Auto-switches to offline cached data
* Visual network indicator in header

### 📴 Offline Mode

* Map & route caching (IndexedDB)
* Offline navigation alerts
* Stored collision events
* Works in low-connectivity areas

---

## 🛑 Safety & Alerts

* ⚠️ **Speed Limit Alerts** (Visual + Audio + Haptics)
* 💥 **Collision Warnings** (Motion + Camera + GPS)
* 🔔 **Local Notifications** (Break reminders, alerts)
* 📩 **Push Notifications** (Emergency events)
* 📳 **Haptic Feedback** (Severity-based)

---

## 🧍 Driver Assistance Features

* 😴 **Driver Fatigue Detection**
* 🌙 **Auto Night Mode (after 7 PM)**
* 🗺️ **Accident History Heatmap**
* 📞 **Emergency Contacts Manager**
* 🔋 **Battery & Device Health Monitoring**

---

## 📱 Native Mobile Support (Capacitor)

Fully converted to native mobile app using **Capacitor**:

### Native Features Used

* 📍 Background Geolocation
* 📷 Native Camera
* 📳 Haptics
* 🧭 Motion Sensors
* 🔊 Native Speech (TTS)
* 🔔 Push & Local Notifications
* 📶 Network Status
* 🔋 Device & Battery Info

---

## 🛠️ Tech Stack

### Frontend

* React + TypeScript
* Tailwind CSS
* Vite
* TensorFlow.js
* Leaflet Maps

### Backend / Services

* OSRM (Routing)
* IndexedDB (Offline cache)
* Browser APIs (Speech, Camera)

### Mobile

* Capacitor
* Android Studio
* Xcode (iOS)

---

## 📂 Project Structure

```
src/
│── components/
│   ├── CollisionMap
│   ├── AdvancedCameraDetection
│   ├── NetworkStatusIndicator
│   ├── SpeedLimitAlert
│   ├── EmergencySOS
│   └── DeviceStatus
│
│── hooks/
│   ├── useRealtimeTracking
│   ├── useNetworkStatus
│   ├── useMotionSensors
│   ├── useOfflineCache
│
│── pages/
│   ├── Index.tsx
│   └── Settings.tsx
│
│── styles/
│── utils/
│── main.tsx
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/colosion.git
cd colosion
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Run Development Server

```bash
npm run dev
```

---

## 📱 Build Native App (Android / iOS)

```bash
npm run build
npx cap sync
```

### Android

```bash
npx cap add android
npx cap run android
```

### iOS (Mac Required)

```bash
npx cap add ios
npx cap run ios
```

---

## 🔐 Permissions Required (Mobile)

* Camera
* Location (Foreground + Background)
* Motion Sensors
* Notifications
* Microphone (Voice Commands)

---

## 🚀 Use Cases

* Two-wheeler rider safety
* Smart helmet integration
* Fleet safety monitoring
* Delivery rider protection
* Smart city traffic analysis

---

## 📈 Future Enhancements

* ML-based accident prediction
* Cloud dashboard analytics
* Smart wearable integration
* V2V (Vehicle-to-Vehicle) alerts
* Emergency service auto-dial

---

## 🏆 Why Colosion?

> **Not just a project — a real-world, production-grade safety system.**
> Built with **real APIs, real sensors, real AI, and real native mobile features**.

Perfect for:

* Hackathons
* Startups
* Research
* Portfolio
* Real deployment

---

## 👨‍💻 Author

**Neeraj Upadhayay**
Cybersecurity & Full-Stack Developer
📧 Email: [neerajupadhayay347@gmail.com](mailto:neerajupadhayay347@gmail.com)
🔗 LinkedIn & GitHub available on request
