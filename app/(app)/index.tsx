import { useRouter } from "expo-router";
import React, { useCallback } from "react";

import { Button, ButtonText } from "@/components/ui/button";
import { FormControl } from "@/components/ui/form-control";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

export default function HomeScreen() {
  const router = useRouter();
  const [meetingTitle, setMeetingTitle] = React.useState("");

  const handleStartMeeting = useCallback(() => {
    const title = meetingTitle.trim() || "New Meeting";
    router.push({
      pathname: "/(app)/[meeting]",
      params: { meeting: title },
    });
  }, [meetingTitle, router]);

  return (
    <VStack space="xl" className="flex-1 bg-background-0 p-4">
      <VStack space="md">
        <Text size="2xl" bold>
          Video Meetings
        </Text>
        <Text size="sm" className="text-typography-500">
          Start or join a secure video meeting powered by AWS Chime
        </Text>
      </VStack>

      <VStack space="md" className="flex-1">
        <FormControl>
          <Input variant="outline" className="bg-background-0">
            <InputField
              placeholder="Enter meeting title"
              value={meetingTitle}
              onChangeText={setMeetingTitle}
            />
          </Input>
        </FormControl>

        <Button size="lg" variant="solid" className="bg-primary-500" onPress={handleStartMeeting}>
          <ButtonText>Start Meeting</ButtonText>
        </Button>
      </VStack>
    </VStack>
  );
}
