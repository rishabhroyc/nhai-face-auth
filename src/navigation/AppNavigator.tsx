import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SplashScreen} from '@screens/SplashScreen';
import {LoginScreen} from '@screens/LoginScreen';
import {EnrollmentScreen} from '@screens/EnrollmentScreen';
import {AttendanceScreen} from '@screens/AttendanceScreen';
import {HistoryScreen} from '@screens/HistoryScreen';
import {AnalyticsScreen} from '@screens/AnalyticsScreen';
import {SettingsScreen} from '@screens/SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2980b9',
        tabBarInactiveTintColor: '#7f8c8d'
      }}
    >
      <Tab.Screen 
        name="Attendance" 
        component={AttendanceScreen}
        options={{tabBarIcon: ({color}) => ({icon: '📷', color})}}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{tabBarIcon: ({color}) => ({icon: '📋', color})}}
      />
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsScreen}
        options={{tabBarIcon: ({color}) => ({icon: '📊', color})}}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{tabBarIcon: ({color}) => ({icon: '⚙️', color})}}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Splash" screenOptions={{headerShown: false}}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Enrollment" component={EnrollmentScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
    </Stack.Navigator>
  );
};