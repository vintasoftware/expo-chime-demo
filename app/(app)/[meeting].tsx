import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";

import { MeetingScreen } from "@/components/MeetingScreen";
import { Button, ButtonText } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { ChimeMeetingProvider, useChimeMeeting } from "@/modules/expo-aws-chime";

function MeetingWrapper({ title }: { title: string }) {
  const router = useRouter();
  const { checkAndRequestPermissions, error, isLoading } = useChimeMeeting();
  const [isPermissionsGranted, setIsPermissionsGranted] = useState(false);

  const requestPermissions = useCallback(async () => {
    const granted = await checkAndRequestPermissions();
    setIsPermissionsGranted(granted);
  }, [checkAndRequestPermissions]);

  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  if (isLoading) {
    return (
      <VStack space="md" className="flex-1 items-center justify-center bg-background-0">
        <Spinner size="large" />
        <Text>Joining meeting...</Text>
      </VStack>
    );
  }

  if (!isPermissionsGranted) {
    return (
      <VStack space="md" className="flex-1 items-center justify-center bg-background-0 p-4">
        <Text>Permissions not granted</Text>
        <Button variant="outline" onPress={requestPermissions}>
          <ButtonText>Request Permissions</ButtonText>
        </Button>
      </VStack>
    );
  }

  if (error) {
    return (
      <VStack space="md" className="flex-1 items-center justify-center bg-background-0 p-4">
        <Text className="text-error-500">{error}</Text>
        <Button
          variant="outline"
          onPress={() => {
            router.dismissTo("/");
          }}
        >
          <Text>Go Back</Text>
        </Button>
      </VStack>
    );
  }

  return <MeetingScreen meetingTitle={title} />;
}

export default function MeetingPage() {
  const { meeting: title = "New Meeting" } = useLocalSearchParams<{ meeting: string }>();

  return (
    <ChimeMeetingProvider>
      <MeetingWrapper title={title} />
    </ChimeMeetingProvider>
  );
}
