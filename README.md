# Three.js VRM Character Controller

This project is a real-time 3D character controller built with [Three.js](https://threejs.org/) and the [@pixiv/three-vrm](https://github.com/pixiv/three-vrm) library. It allows you to load, display, and interact with 3D characters in the [VRM format](https://vrm.dev/). The controller supports various animations, facial expressions, and dynamic behaviors, all manageable through a simple graphical user interface.

## Features

- **VRM Model Loading**: Easily load and display any VRM 1.0 model. The project comes with a default VRM model included.
- **Animation Control**: Play and blend between multiple animations. The system uses a state-machine-like approach to manage character animations smoothly.
- **Facial Expression Control**: Dynamically change the character's facial expressions in real-time. The controller supports standard VRM expressions like "happy," "sad," "angry," etc.
- **Arm Space Controller**: Adjust the character's arm spacing to prevent clipping with the body or clothing, which is particularly useful for animations that bring the arms close to the chest.
- **Look-At Controller**: Make the character's head and eyes follow the camera, creating a more interactive and engaging experience.
- **Dynamic Environments**: Switch between different 3D environments to see how the character looks in various settings.
- **GUI Controls**: A user-friendly interface built with `lil-gui` to manage all the features mentioned above.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed on your system.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```
2. **Install the dependencies:**
   ```bash
   npm install
   ```

### Running the Project

To run the project in a development server, use the following command:

```bash
npm run dev
```

This will start a Vite development server, and you can view the application by navigating to the URL provided in your terminal (usually `http://localhost:5173`).

## Usage

Once the application is running, you can interact with the character using the GUI panel on the right side of the screen.

- **Animation**: Select an animation from the dropdown to play it.
- **Expression**: Use the sliders to control the intensity of different facial expressions.
- **Arm Space**: Adjust the arm spacing to fix clipping issues.
- **Look At**: Toggle the "look at" behavior and adjust its intensity.
- **Environment**: Switch between available environments.

## File Structure

Here's an overview of the key files and directories in the project:

- `index.html`: The main HTML file that serves as the entry point for the application.
- `src/main.js`: The core of the application, where the Three.js scene, renderer, and controllers are initialized.
- `src/AnimationController.js`: Manages loading and playing animations.
- `src/ExpressionController.js`: Controls the character's facial expressions.
- `src/ArmSpaceController.js`: Adjusts the character's arm spacing.
- `src/environment.js`: Handles loading and switching between different 3D environments.
- `src/gui.js`: Sets up the `lil-gui` panel and its controls.
- `public/`: Contains static assets like the VRM model, animations, and environment files.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
