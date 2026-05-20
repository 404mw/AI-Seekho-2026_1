import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IoniconsName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function ProviderLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brandSecondary,
        tabBarInactiveTintColor: colors.labelTertiary,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.separatorOpaque },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { color: colors.label },
          tabBarIcon: ({ color, size }) => <TabIcon name="stats-chart-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => <TabIcon name="calendar-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <TabIcon name="person-circle-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
