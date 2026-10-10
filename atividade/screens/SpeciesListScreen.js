import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ANIMALS } from '../data/animals';
import AnimalCard from '../components/AnimalCard';
import NavBar from '../components/NavBar';

// TELA 2 — Lista de espécies. Cada card abre a PÁGINA daquele animal.
export default function SpeciesListScreen({ navigation }) {
  const [openId, setOpenId] = useState(null);

  return (
    <View style={styles.bg}>
      <FlatList
        data={ANIMALS}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <AnimalCard
            animal={item}
            expanded={openId === item.id}
            onToggle={() => setOpenId(openId === item.id ? null : item.id)}
            onOpen={() => navigation.navigate('Detalhes', { animal: item })}
          />
        )}
        ListFooterComponent={
          <NavBar navigation={navigation} current="Espécies" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#1F1E26' },
  list: { padding: 12 },
});
