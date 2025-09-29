import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ToolChestScreen from './screens/ToolChestScreen';
import StrategyFormScreen from './screens/StrategyFormScreen';

const Stack = createNativeStackNavigator();

export default function ToolChestNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="ToolChest" component={ToolChestScreen} />
        <Stack.Screen
          name="StrategyForm"
          component={StrategyFormScreen}
          options={{ title: 'Strategy' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

