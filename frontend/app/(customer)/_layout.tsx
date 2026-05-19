import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IoniconsName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function CustomerLayout() {
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
        }}
      />
      <Tabs.Screen
        name="(requests)"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color, size }) => <TabIcon name="time-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="(bookings)"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => <TabIcon name="calendar-outline" color={color} size={size} />,
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
