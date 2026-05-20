import React from 'react';
import { View } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IoniconsName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

function DisabledTabButton(props: React.ComponentProps<typeof View>) {
  const { style, children, ...rest } = props;
  return (
    <View {...rest} style={[style, { opacity: 0.3 }]} pointerEvents="none">
      {children}
    </View>
  );
}

export default function CustomerLayout() {
  const pathname = usePathname();
  const isOnboarding = pathname === '/become-provider';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.labelTertiary,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.separatorOpaque },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <TabIcon name="sparkles-outline" color={color} size={size} />,
          tabBarButton: isOnboarding ? (props) => <DisabledTabButton {...(props as any)} /> : undefined,
        }}
      />
      <Tabs.Screen
        name="(requests)"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color, size }) => <TabIcon name="time-outline" color={color} size={size} />,
          tabBarButton: isOnboarding ? (props) => <DisabledTabButton {...(props as any)} /> : undefined,
        }}
      />
      <Tabs.Screen
        name="(bookings)"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => <TabIcon name="calendar-outline" color={color} size={size} />,
          tabBarButton: isOnboarding ? (props) => <DisabledTabButton {...(props as any)} /> : undefined,
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <TabIcon name="person-circle-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
