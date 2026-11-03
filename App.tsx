import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppNavigator} from '@navigation/AppNavigator';
import {initializeDatabase} from '@database/DatabaseInitializer';
import {useFaceRecognitionStore} from '@store/faceRecognitionStore';
import {useSyncStore} from '@store/syncStore';

function App(): React.JSX.Element {
  const {initializeModels} = useFaceRecognitionStore();
  const {initializeSync} = useSyncStore();

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
        await initializeModels();
        await initializeSync();
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };
    init();
  }, [initializeModels, initializeSync]);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;