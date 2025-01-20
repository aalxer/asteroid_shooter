# Asteroid Shooter mit Three.js

## Das Spiel lokal starten
Bevor das Spiel gestartet werden kann, muss sichergestellt werden, dass alle benötigten Bibliotheken installiert sind.  
Dafür in Terminal folgendes ausführen:
```
npm install
```
Das Spiel wird lokal mit Vite gestartet, Vite wird verwendet, um den lokalen Entwicklungsserver zu starten und die Anwendung auszuführen.  
Dafür in Terminal folgendes ausführen:
```
npx vite
```
## Particle System Effects
Zur Erzeugung animierter Effekte im Spiel, wie Rauch- und Explosionseffekte wurden verschiedene Particle-Systeme verwendet.
Jedes Partikelsystem ist in einem separaten Modul implementiert, um sie unabhängig flexibel voneinander anzupassen.  
Die Module befinden sich in ./libs/ und basieren auf einem ursprünglich aus einem externen Git-Repository bezogenen Modul,
das speziell für verschiedene Effekte wie Rauch, Feuer, Laser und Explosionen angepasst wurde.  

Die angepassten Zeilen in dem jeweiligen Script sind zwischen folgenden Zeilen zu finden:  
```
// ---------------------------------------------------------------------------------  
// AHMED HAMID KADHUM  
// code  
// ----------------------------------------------------------------------------------  
```
ursprünglicher Code für die Module: [Github - Simple Particle Effects](https://github.com/bobbyroe/Simple-Particle-Effects)  
Tutorial für dieses Modul: [Youtube - Simple Particle Effects](https://www.youtube.com/watch?v=h1UQdbuF204&t=295s)  

## Verwendete Artikels
Die Kollisionsprüfung wurde durch diesen Artikel gelernt und im Spiel umgesetzt:  
[Exploring Collision Detection in Three.js](https://jainmanshu.medium.com/exploring-collision-detection-in-three-js-82dc95a383f4) 

Das Verstehen und umsetzten von Lighting und den unterschiedlichen Lichttypen in Three.js war mithilfe dieser zwei Videos:  
[Three.js Lighting Tutorial with Examples](https://www.youtube.com/watch?v=bsLosbweLNE&t=158s)  
[Three.js Lighting Tutorial (JavaScript) | Light Types Explained!](https://www.youtube.com/watch?v=T6PhV4Hz0u4&t=308s)

## Assets im Projekt
Die 3D-Objekte im Spiel werden als .obj-Dateien mit zugehörigen .mtl-Dateien und Textures für das Design des Objekts geladen. Diese Objekte sind aus der folgenden Quelle:
[CG-Trader](https://www.cgtrader.com)