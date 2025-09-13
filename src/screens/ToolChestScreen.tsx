import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity } from 'react-native';
import { Strategy, loadStrategies } from '../storage/strategyStorage';

interface Props {
  navigation: any;
}

export default function ToolChestScreen({ navigation }: Props) {
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadStrategies().then(setStrategies);
    });
    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item }: { item: Strategy }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('StrategyForm', { strategy: item })}
    >
      <Text style={{ padding: 16 }}>{item.text}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={strategies}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={{ padding: 16 }}>No strategies yet.</Text>}
      />
      <Button
        title="Add Strategy"
        onPress={() => navigation.navigate('StrategyForm')}
      />
    </View>
  );
}

