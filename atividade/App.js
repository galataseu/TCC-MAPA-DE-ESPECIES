import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from './screens/HomeScreen';
import SpeciesListScreen from './screens/SpeciesListScreen';
import DetailsScreen from './screens/DetailsScreen';
import BiomesScreen from './screens/BiomesScreen';
import StatusScreen from './screens/StatusScreen';

const Stack = createStackNavigator();

// Tema escuro igual ao do site (#23222B + laranja #FFAA44).
const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#1F1E26',
    card: '#23222B',
    text: '#FFFFFF',
    primary: '#FFAA44',
    border: '#3B3A48',
  },
};

export default function App() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Início"
        screenOptions={{
          headerStyle: { backgroundColor: '#23222B' },
          headerTintColor: '#FFAA44',
          headerTitleStyle: { fontWeight: '800' },
          cardStyle: { backgroundColor: '#1F1E26' },
        }}>
        <Stack.Screen
          name="Início"
          component={HomeScreen}
          options={{ title: '🦜 Gralha dos Ventos' }}
        />
        <Stack.Screen
          name="Espécies"
          component={SpeciesListScreen}
          options={{ title: 'Animais Cadastrados' }}
        />
        <Stack.Screen
          name="Detalhes"
          component={DetailsScreen}
          options={({ route }) => ({
            title: route.params?.animal?.nome ?? 'Detalhes',
          })}
        />
        <Stack.Screen
          name="Biomas"
          component={BiomesScreen}
          options={{ title: 'Biomas do Sul' }}
        />
        <Stack.Screen
          name="Conservação"
          component={StatusScreen}
          options={{ title: 'Níveis de Extinção' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
