import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import {
  check,
  checkMultiple,
  Permission,
  PERMISSIONS,
  request,
  requestMultiple,
} from "react-native-permissions";

import { ChimeAPI } from "./ChimeAPI";
import type {
  AttendeeInfo,
  ChimeEventMap,
  MeetingInfo,
  VideoTileEvent,
} from "./ExpoAWSChime.types";
import {
  mute,
  startLocalVideo,
  startMeeting,
  stopLocalVideo,
  stopMeeting,
  unmute,
} from "./ExpoAWSChimeModule";
import { addListener } from "./ExpoAWSChimeModule";
import { getChimeConfig } from "./utils/config";

interface ChimeMeetingContextValue {
  isInMeeting: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isLoading: boolean;
  attendees: string[];
  videoTiles: VideoTileEvent[];
  error: string | null;
  currentMeeting: MeetingInfo | null;
  currentAttendee: AttendeeInfo | null;
  checkAndRequestPermissions: () => Promise<boolean>;
  joinMeeting: (title: string) => Promise<void>;
  leaveMeeting: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleVideo: () => Promise<void>;
}

const ChimeMeetingContext = createContext<ChimeMeetingContextValue | null>(null);

// Required permissions for AWS Chime SDK
const CHIME_PERMISSIONS = Platform.select({
  android: {
    audio: PERMISSIONS.ANDROID.RECORD_AUDIO,
    camera: PERMISSIONS.ANDROID.CAMERA,
    // Note: MODIFY_AUDIO_SETTINGS is not a runtime permission, it's declared in the manifest
  },
  ios: {
    audio: PERMISSIONS.IOS.MICROPHONE,
    camera: PERMISSIONS.IOS.CAMERA,
  },
  default: {},
});

// Create a singleton instance of ChimeAPI
const chimeAPI = new ChimeAPI(getChimeConfig());

export function ChimeMeetingProvider({ children }: { children: React.ReactNode }) {
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [videoTiles, setVideoTiles] = useState<VideoTileEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentMeeting, setCurrentMeeting] = useState<MeetingInfo | null>(null);
  const [currentAttendee, setCurrentAttendee] = useState<AttendeeInfo | null>(null);

  // Keep track of meeting cleanup state
  const cleanupInProgress = useRef(false);

  const cleanup = useCallback(async () => {
    if (cleanupInProgress.current) return;
    cleanupInProgress.current = true;

    try {
      if (currentMeeting?.MeetingId) {
        await stopMeeting();
      }
    } catch (err) {
      console.error("Failed to cleanup meeting:", err);
    } finally {
      setIsInMeeting(false);
      setAttendees([]);
      setVideoTiles([]);
      setCurrentMeeting(null);
      setCurrentAttendee(null);
      cleanupInProgress.current = false;
    }
  }, [currentMeeting]);

  useEffect(() => {
    const subscriptions = [
      addListener("onMeetingStart", (_params: ChimeEventMap["onMeetingStart"]) => {
        setIsInMeeting(true);
        setError(null);
      }),
      addListener("onMeetingEnd", (params: ChimeEventMap["onMeetingEnd"]) => {
        console.log("Meeting ended with status:", params.sessionStatus);
        cleanup();
      }),
      addListener("onAttendeesJoin", (params: ChimeEventMap["onAttendeesJoin"]) => {
        setAttendees((prev) => [...new Set([...prev, ...params.attendeeIds])]);
      }),
      addListener("onAttendeesLeave", (params: ChimeEventMap["onAttendeesLeave"]) => {
        setAttendees((prev) => prev.filter((id) => !params.attendeeIds.includes(id)));
      }),
      addListener("onAttendeesMute", (params: ChimeEventMap["onAttendeesMute"]) => {
        // If the current user is in the list, update the mute state
        if (currentAttendee && params.attendeeIds.includes(currentAttendee.AttendeeId)) {
          setIsMuted(true);
        }
      }),
      addListener("onAttendeesUnmute", (params: ChimeEventMap["onAttendeesUnmute"]) => {
        // If the current user is in the list, update the mute state
        if (currentAttendee && params.attendeeIds.includes(currentAttendee.AttendeeId)) {
          setIsMuted(false);
        }
      }),
      addListener("onAddVideoTile", (params: ChimeEventMap["onAddVideoTile"]) => {
        setVideoTiles((prev) => [...prev, params]);
      }),
      addListener("onRemoveVideoTile", (params: ChimeEventMap["onRemoveVideoTile"]) => {
        setVideoTiles((prev) => prev.filter((tile) => tile.tileId !== params.tileId));
      }),
      addListener("onError", (params: ChimeEventMap["onError"]) => {
        setError(params.error);
        setIsLoading(false);
      }),
    ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [cleanup, currentAttendee]);

  const checkAndRequestPermissions = useCallback(async () => {
    if (!CHIME_PERMISSIONS) return true;

    try {
      const permissions = [CHIME_PERMISSIONS.audio, CHIME_PERMISSIONS.camera].filter(
        Boolean,
      ) as Permission[];
      const statuses = await checkMultiple(permissions);
      const deniedPermissions = permissions.filter(
        (permission) => statuses[permission] === "denied",
      );
      const blockedPermissions = permissions.filter(
        (permission) => statuses[permission] === "blocked",
      );

      if (blockedPermissions.length > 0) {
        Alert.alert(
          "Permissions Required",
          "Please enable camera and microphone permissions in your device settings to use video meetings.",
          [{ text: "OK" }],
        );
        return false;
      }
      if (deniedPermissions.length > 0) {
        const results = await requestMultiple(deniedPermissions);
        const stillDenied = Object.values(results).some((status) => status !== "granted");

        if (stillDenied) {
          Alert.alert(
            "Permissions Required",
            "Camera and microphone access is required for video meetings.",
            [{ text: "OK" }],
          );
          return false;
        }
      }
      return true;
    } catch (err) {
      console.error("Error checking permissions:", err);
      return false;
    }
  }, []);

  const joinMeeting = useCallback(
    async (title: string) => {
      try {
        console.log("Joining meeting with title:", title);
        setIsLoading(true);
        setError(null);

        const hasPermissions = await checkAndRequestPermissions();
        if (!hasPermissions) {
          throw new Error("Required permissions not granted");
        }

        const { Meeting, Attendee } = await chimeAPI.joinMeeting(title);
        if (!Meeting || !Attendee) {
          throw new Error("Invalid meeting data received");
        }

        setIsInMeeting(true);
        setCurrentMeeting(Meeting);
        setCurrentAttendee(Attendee);

        await startMeeting(Meeting, Attendee);
      } catch (err) {
        console.error("Error in joinMeeting:", err);
        setError(err instanceof Error ? err.message : "Failed to join meeting");
        cleanup();
      } finally {
        setIsLoading(false);
      }
    },
    [cleanup, checkAndRequestPermissions],
  );

  const leaveMeeting = useCallback(async () => {
    try {
      setIsLoading(true);
      await cleanup();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave meeting");
    } finally {
      setIsLoading(false);
    }
  }, [cleanup]);

  const toggleMute = useCallback(async () => {
    if (!isInMeeting) return;

    try {
      if (isMuted) {
        await unmute();
      } else {
        await mute();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle mute");
    }
  }, [isInMeeting, isMuted]);

  const toggleVideo = useCallback(async () => {
    if (!isInMeeting) return;

    try {
      if (isVideoEnabled) {
        await stopLocalVideo();
        setIsVideoEnabled(false);
      } else {
        const cameraPermission = CHIME_PERMISSIONS?.camera;
        if (cameraPermission) {
          const status = await check(cameraPermission);
          if (status !== "granted") {
            const result = await request(cameraPermission);
            if (result !== "granted") {
              throw new Error("Camera permission not granted");
            }
          }
        }
        await startLocalVideo();
        setIsVideoEnabled(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle video");
    }
  }, [isInMeeting, isVideoEnabled]);

  const value: ChimeMeetingContextValue = {
    isInMeeting,
    isMuted,
    isVideoEnabled,
    isLoading,
    attendees,
    videoTiles,
    error,
    currentMeeting,
    currentAttendee,
    checkAndRequestPermissions,
    joinMeeting,
    leaveMeeting,
    toggleMute,
    toggleVideo,
  };

  return <ChimeMeetingContext.Provider value={value}>{children}</ChimeMeetingContext.Provider>;
}

export function useChimeMeeting() {
  const context = useContext(ChimeMeetingContext);
  if (!context) {
    throw new Error("useChimeMeeting must be used within a ChimeMeetingProvider");
  }
  return context;
}
