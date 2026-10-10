import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { ANIMALS } from '../data/animals';
import NavBar from '../components/NavBar';

// TELA 1 — Início / boas-vindas (etapa inicial da progressão).
export default function HomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.box}>
      <Text style={styles.emoji}>🦜</Text>
      <Text style={styles.title}>GRALHA DOS VENTOS</Text>
      <Text style={styles.sub}>Mapa de Espécies da Região Sul</Text>
      <Text style={styles.text}>
        Explore {ANIMALS.length} animais do Sul do Brasil: abra a lista, toque
        em um card para ver a página dele, conheça os biomas e os níveis de
        extinção.
      </Text>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.cta}
        onPress={() => navigation.navigate('Espécies')}>
        <Text style={styles.ctaText}>Começar: ver espécies →</Text>
      </TouchableOpacity>
      <NavBar navigation={navigation} current="Início" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#1F1E26' },
  box: { alignItems: 'center', padding: 24 },
  emoji: { fontSize: 64 },
  title: {
    color: '#FFAA44',
    fontSize: 26,
    fontWeight: '900',
    fontStyle: 'italic',
    marginTop: 12,
  },
  sub: { color: '#A09FA9', fontSize: 14, marginTop: 4 },
  text: {
    color: '#D1D1D8',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 16,
  },
  cta: {
    backgroundColor: '#9C5B1C',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 20,
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
