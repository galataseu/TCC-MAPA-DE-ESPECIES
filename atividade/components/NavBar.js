import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Barra de botões presente em todas as telas: cada tela navega
// para telas diferentes e dá para avançar/voltar livremente.
const ALL = [
  { route: 'Início', label: '🏠 Início' },
  { route: 'Espécies', label: '🦜 Espécies' },
  { route: 'Biomas', label: '🌳 Biomas' },
  { route: 'Conservação', label: '⚠️ Status' },
];

export default function NavBar({ navigation, current }) {
  return (
    <View style={styles.bar}>
      {ALL.filter((b) => b.route !== current).map((b) => (
        <TouchableOpacity
          key={b.route}
          activeOpacity={0.7}
          style={styles.btn}
          onPress={() => navigation.navigate(b.route)}>
          <Text style={styles.text}>{b.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  btn: {
    backgroundColor: '#9C5B1C',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  text: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
