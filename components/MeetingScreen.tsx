import { useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { View } from "react-native";

import { Button, ButtonText } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { ExpoAWSChimeView, useChimeMeeting } from "@/modules/expo-aws-chime";

interface MeetingScreenProps {
  meetingTitle: string;
}

export function MeetingScreen({ meetingTitle }: MeetingScreenProps) {
  const {
    isInMeeting,
    isMuted,
    isVideoEnabled,
    attendees,
    videoTiles,
    error,
    joinMeeting,
    leaveMeeting,
    toggleMute,
    toggleVideo,
  } = useChimeMeeting();
  const router = useRouter();

  const handleLeaveMeeting = useCallback(() => {
    leaveMeeting();
    router.dismissTo("/");
  }, [leaveMeeting, router]);

  React.useEffect(() => {
    if (!isInMeeting) {
      joinMeeting(meetingTitle);
    }
    return () => {
      if (isInMeeting) {
        handleLeaveMeeting();
      }
    };
  }, [isInMeeting, joinMeeting, handleLeaveMeeting, meetingTitle]);

  // Separate local and remote video tiles
  const { localVideoTile, remoteVideoTiles } = useMemo(() => {
    const local = videoTiles.find((tile) => tile.isLocal);
    const remote = videoTiles.filter((tile) => !tile.isLocal);
    return { localVideoTile: local, remoteVideoTiles: remote };
  }, [videoTiles]);

  // Calculate grid rows based on number of remote participants
  const gridLayout = useMemo(() => {
    const count = remoteVideoTiles.length;

    // Define how to split participants into rows
    if (count === 0) return [];
    if (count === 1) return [1]; // 1 participant in 1 row
    if (count === 2) return [1, 1]; // 1 participant in each of 2 rows
    if (count === 3) return [1, 2]; // 1 in first row, 2 in second row
    if (count === 4) return [2, 2]; // 2 in each of 2 rows
    if (count === 5) return [2, 3]; // 2 in first row, 3 in second row
    if (count === 6) return [2, 2, 2]; // 2 in each of 3 rows

    // For more participants, distribute evenly across 3 rows
    const basePerRow = Math.floor(count / 3);
    const remainder = count % 3;

    return [basePerRow + (remainder > 0 ? 1 : 0), basePerRow + (remainder > 1 ? 1 : 0), basePerRow];
  }, [remoteVideoTiles.length]);

  // Calculate height percentages for rows
  const getRowHeightClass = (totalRows: number) => {
    switch (totalRows) {
      case 1:
        return "h-full";
      case 2:
        return "h-1/2";
      case 3:
        return "h-1/3";
      default:
        return "h-1/3";
    }
  };

  if (error) {
    return (
      <VStack space="md" className="items-center bg-background-0">
        <Text className="text-error-500">{error}</Text>
        <Button onPress={() => router.dismissTo("/")}>
          <ButtonText>Go Back</ButtonText>
        </Button>
      </VStack>
    );
  }

  return (
    <VStack className="flex-1 bg-background-0">
      {/* Main video grid for remote participants */}
      <View className="relative flex-1">
        {remoteVideoTiles.length > 0 ? (
          <VStack className="h-full w-full p-1">
            {gridLayout.map((participantsInRow, rowIndex) => {
              // Calculate which tiles belong to this row
              const startIndex = gridLayout
                .slice(0, rowIndex)
                .reduce((sum, count) => sum + count, 0);
              const tilesInRow = remoteVideoTiles.slice(startIndex, startIndex + participantsInRow);

              return (
                <View
                  key={`row-${rowIndex}`}
                  className={`my-1 flex-1 flex-row ${getRowHeightClass(gridLayout.length)}`}
                >
                  {tilesInRow.map((tile) => (
                    <View key={tile.tileId} className="mx-1 flex-1 overflow-hidden rounded-lg">
                      <ExpoAWSChimeView
                        tileId={tile.tileId}
                        isLocal={false}
                        className="h-full w-full"
                      />
                      <Text
                        size="sm"
                        className="absolute bottom-2 left-2 rounded bg-black/50 px-1 py-0.5 text-typography-white"
                      >
                        {`Attendee ${tile.attendeeId}`}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </VStack>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-typography-400">Waiting for participants...</Text>
          </View>
        )}

        {/* Local video overlay */}
        {localVideoTile && (
          <View className="absolute bottom-4 right-4 h-1/5 max-h-[240px] min-h-[160px] w-1/4 min-w-[120px] max-w-[180px] overflow-hidden">
            <ExpoAWSChimeView
              tileId={localVideoTile.tileId}
              isLocal={true}
              className="h-full w-full"
            />
            <Text
              size="sm"
              className="absolute bottom-2 left-2 rounded bg-black/50 px-1 py-0.5 text-typography-white"
            >
              You
            </Text>
          </View>
        )}
      </View>

      {/* Attendees count */}
      <View className="px-4 py-2">
        <Text size="sm">Attendees ({attendees.length})</Text>
      </View>

      {/* Controls */}
      <HStack className="justify-center p-4" space="md">
        <Button
          variant={isMuted ? "solid" : "outline"}
          onPress={toggleMute}
          className="rounded-full"
        >
          <ButtonText>{isMuted ? "Unmute" : "Mute"}</ButtonText>
        </Button>
        <Button
          variant={isVideoEnabled ? "solid" : "outline"}
          onPress={toggleVideo}
          className="rounded-full"
        >
          <ButtonText>{isVideoEnabled ? "Stop Video" : "Start Video"}</ButtonText>
        </Button>
        <Button variant="solid" onPress={leaveMeeting} className="rounded-full bg-error-500">
          <ButtonText>Leave</ButtonText>
        </Button>
      </HStack>
    </VStack>
  );
}
