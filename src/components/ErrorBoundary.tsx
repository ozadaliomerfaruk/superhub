import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCcw } from 'lucide-react-native';
import { COLORS } from '../constants/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 bg-slate-50 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-6">
            <AlertTriangle size={40} color={COLORS.error} />
          </View>

          <Text className="text-2xl font-bold text-slate-900 text-center mb-2">
            Something went wrong
          </Text>

          <Text className="text-base text-slate-500 text-center mb-6">
            We're sorry, but something unexpected happened. Please try again.
          </Text>

          <TouchableOpacity
            onPress={this.handleReset}
            className="flex-row items-center bg-primary-600 px-6 py-3 rounded-xl"
            activeOpacity={0.8}
          >
            <RefreshCcw size={18} color="white" />
            <Text className="text-white font-semibold ml-2">Try Again</Text>
          </TouchableOpacity>

          {__DEV__ && this.state.error && (
            <ScrollView
              className="mt-8 max-h-48 bg-slate-800 rounded-xl p-4 w-full"
              showsVerticalScrollIndicator={false}
            >
              <Text className="text-xs text-red-400 font-mono">
                {this.state.error.toString()}
              </Text>
              {this.state.errorInfo && (
                <Text className="text-xs text-slate-400 font-mono mt-2">
                  {this.state.errorInfo.componentStack}
                </Text>
              )}
            </ScrollView>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}
