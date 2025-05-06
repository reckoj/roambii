// app/_middleware.ts
import { router, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store/store";
import { useGlobalContext } from "@/lib/global-provider";

export default function AgentProfileMiddleware() {
  const navigationState = useRootNavigationState();
  const { isNewAgent } = useSelector((state: RootState) => state.agentProfile);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { isAgent } = useGlobalContext();

  useEffect(() => {
    if (!navigationState?.key) return;

    // If agent is logged in but profile is incomplete, redirect to setup
    if (isAuthenticated && isAgent && isNewAgent) {
      const currentRoute =
        navigationState.routes?.[navigationState.index]?.name;

      // Skip check if already on the profile setup page
      if (currentRoute !== "agent-profile-setup") {
        router.replace("/agent-profile-setup");
      }
    }
  }, [navigationState, isAuthenticated, isAgent, isNewAgent]);

  return null;
}
