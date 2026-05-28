import React from "react";
import { View, Text, Pressable, SafeAreaView, ScrollView } from "react-native";
import { Icon } from "./Icon";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // In a production app, log this to Sentry, Crashlytics, etc.
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRestart = async () => {
    // Since expo-updates is missing, we'll just reset the state
    // and hope the error doesn't happen on next render
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView className="flex-1 bg-background">
          <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <View className="h-24 w-24 rounded-full bg-destructive/10 items-center justify-center mb-8">
              <Icon name="alert-circle" size={48} color="#ef4444" />
            </View>
            
            <Text className="text-3xl font-bold text-foreground mb-4 text-center">
              We hit a snag!
            </Text>
            
            <Text className="text-muted-foreground text-center mb-10 text-base leading-relaxed">
              We're sorry, but something unexpected happened. You can try restarting the app to get back on track.
            </Text>

            <Pressable
              onPress={this.handleRestart}
              className="bg-primary px-10 py-4 rounded-full active:opacity-80 flex-row items-center w-full justify-center"
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, { backgroundColor: '#004CFF' }]}
            >
              <Icon name="refresh-cw" size={20} color="white" />
              <Text className="text-primary-foreground font-bold text-lg">
                Restart App
              </Text>
            </Pressable>

            {__DEV__ && this.state.error && (
              <View className="mt-12 p-4 bg-muted/50 rounded-xl w-full">
                <Text className="text-error font-bold mb-2">DEV ONLY ERROR DETAILS:</Text>
                <Text className="text-foreground text-xs font-mono">{this.state.error.message}</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
