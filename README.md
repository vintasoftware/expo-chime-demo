# Expo AWS Chime Demo (Alpha)

⚠️ **Under heavy development**

A demonstration of AWS Chime SDK integration with Expo/React Native as a native module. This project showcases how to build a video conferencing application using [Expo Modules API](https://docs.expo.dev/versions/latest/sdk/modules/) and [AWS Chime](https://aws.amazon.com/chime/).

<img src="https://github.com/user-attachments/assets/b96f9a6d-8113-4a60-b5a0-cfb0afa39b05" alt="Expo Chime Demo screenshot" width="200" />

## Supported Platforms

- Android
- iOS (coming soon)

## Features

- Real-time video conferencing capabilities
- Audio/video controls (mute/unmute, video on/off)
- Multi-participant video grid with dynamic layout
- Local video preview
- Permissions handling for camera and microphone

## Technical Details
- Custom Expo native module (`expo-aws-chime`)
- React Context API for state management
- Tailwind CSS for styling with NativeWind
- gluestack-ui v2 components for UI elements

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/vintasoftware/expo-chime-demo.git
cd expo-chime-demo
```

2. Install dependencies:
```bash
npm install
```

3. Deploy [the serverless demo of AWS Chime](https://github.com/aws/amazon-chime-sdk-js/tree/main/demos/serverless) and get the API URL. It looks like: `https://<hash>.execute-api.<region>.amazonaws.com/Prod/`

4. Configure the environment variables:
    1. Create the .env.local file in the root directory:
    ```bash
    cp .env.local.example .env.local
    ```
    2. Add your AWS configuration:
    ```
    EXPO_PUBLIC_AWS_REGION=<region>
    EXPO_PUBLIC_AWS_CHIME_ENDPOINT=https://<hash>.execute-api.<region>.amazonaws.com/Prod/
    ```

### Running the App

Currently only Android is supported. AWS Chime SDK doesn't support x86 emulators, so you (probably) need to use a physical mobile device:

1. Open Android Studio and connect your device. The easiest way is to pair your device with Wi-Fi using the ["Pair Devices Using Wi-Fi" option](https://developer.android.com/studio/run/device#wireless).


2. Run the app with:

```bash
npx expo run:android
```

3. Check your physical mobile device.

## Project Structure

- `/app` - Main application code using Expo Router for file-based routing
- `/components` - Reusable React components
- `/components/ui` - gluestack-ui v2 components
- `/modules/expo-aws-chime` - AWS Chime SDK native module implementation
- `/assets` - Static assets like images and fonts

## Native Module Implementation

The AWS Chime SDK is integrated as a custom Expo native module using Expo Modules API in the `/modules/expo-aws-chime` directory. The module provides:

- Native bridge to AWS Chime SDK for Android
- React hooks for easy integration (`useChimeMeeting`)
- Context provider for state management (`ChimeMeetingProvider`)
- Native view component for rendering video tiles (`ExpoAWSChimeView`)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the `LICENSE.txt` file for details.

## Commercial Support

[![alt text](https://avatars2.githubusercontent.com/u/5529080?s=80&v=4 "Vinta Logo")](https://www.vintasoftware.com/)

This is an open-source project maintained by [Vinta Software](https://www.vinta.com.br/). We are always looking for exciting work! If you need any commercial support, feel free to get in touch: contact@vinta.com.br
