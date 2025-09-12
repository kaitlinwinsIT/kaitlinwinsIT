import React, { useState } from 'react';
import { View, TextInput, Button } from 'react-native';
import { Strategy, saveStrategy, deleteStrategy } from '../storage/strategyStorage';
import uuid from 'react-native-uuid';

interface Props {
  navigation: any;
  route: { params?: { strategy?: Strategy } };
}

export default function StrategyFormScreen({ navigation, route }: Props) {
  const existing = route.params?.strategy;
  const [text, setText] = useState(existing?.text ?? '');

  const onSave = async () => {
    const strategy: Strategy = {
      id: existing?.id ?? (uuid.v4() as string),
      text,
    };
    await saveStrategy(strategy);
    navigation.goBack();
  };

  const onDelete = async () => {
    if (existing) {
      await deleteStrategy(existing.id);
    }
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Coping strategy"
        style={{ borderWidth: 1, padding: 8, marginBottom: 16 }}
      />
      <Button title="Save" onPress={onSave} />
      {existing ? <Button title="Delete" onPress={onDelete} /> : null}
    </View>
  );
}

