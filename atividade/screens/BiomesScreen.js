import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ANIMALS } from '../data/animals';
import NavBar from '../components/NavBar';

// TELA 4 — Biomas (etapa 4 da progressão).
const BIOMES = [
  {
    nome: 'Mata Atlântica',
    cor: '#287F5E',
    descricao: 'Floresta densa e úmida. Casa da gralha-azul, do bugio e da jaguatirica.',
  },
  {
    nome: 'Pampa',
    cor: '#3B7BA5',
    descricao: 'Campos abertos do RS. Casa do quero-quero, do lobo-guará e da jaguatirica.',
  },
  {
    nome: 'Cerrado',
    cor: '#E6C140',
    descricao: 'Savana do norte do PR. Passagem do lobo-guará e do quero-quero.',
  },
];

export default function BiomesScreen({ navigation }) {
  const countOf = (nome) => ANIMALS.filter((a) => a.biomas.includes(nome)).length;

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.box}>
      <Text style={styles.title}>Biomas da Região Sul</Text>
      {BIOMES.map((b) => (
        <TouchableOpacity
          key={b.nome}
          activeOpacity={0.8}
          style={[styles.card, { borderLeftColor: b.cor }]}
          onPress={() => navigation.navigate('Espécies')}>
          <Text style={styles.name}>🌳 {b.nome}</Text>
          <Text style={styles.desc}>{b.descricao}</Text>
          <Text style={styles.count}>{countOf(b.nome)} espécie(s) neste app</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.cta}
        onPress={() => navigation.navigate('Conservação')}>
        <Text style={styles.ctaText}>Avançar: níveis de extinção →</Text>
      </TouchableOpacity>
      <NavBar navigation={navigation} current="Biomas" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#1F1E26' },
  box: { padding: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 12 },
  card: {
    backgroundColor: '#23222B',
    borderWidth: 1,
    borderColor: '#3B3A48',
    borderLeftWidth: 5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  name: { color: '#fff', fontSize: 17, fontWeight: '800' },
  desc: { color: '#D1D1D8', fontSize: 14, lineHeight: 20, marginTop: 6 },
  count: { color: '#FFAA44', fontSize: 13, fontWeight: '700', marginTop: 6 },
  cta: {
    backgroundColor: '#9C5B1C',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 13,
    marginTop: 4,
    alignSelf: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
