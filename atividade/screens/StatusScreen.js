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

// TELA 5 — Níveis de extinção (última etapa da progressão).
const LEVELS = [
  { sigla: 'EX', nome: 'Extinta', cor: '#403E4C' },
  { sigla: 'EW', nome: 'Extinta na Natureza', cor: '#831F34' },
  { sigla: 'RE', nome: 'Regionalmente Extinta', cor: '#B0214F' },
  { sigla: 'CR', nome: 'Criticamente em Perigo', cor: '#FF4068' },
  { sigla: 'EN', nome: 'Em Perigo', cor: '#FF6426' },
  { sigla: 'VU', nome: 'Vulnerável', cor: '#FFA63A' },
  { sigla: 'NT', nome: 'Quase Ameaçada', cor: '#217757' },
  { sigla: 'LC', nome: 'Pouco Preocupante', cor: '#1A5FB4' },
  { sigla: 'DD', nome: 'Dados Insuficientes', cor: '#555555' },
];

export default function StatusScreen({ navigation }) {
  const countOf = (sigla) => ANIMALS.filter((a) => a.sigla === sigla).length;

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.box}>
      <Text style={styles.title}>Níveis de Extinção</Text>
      <Text style={styles.sub}>As cores são as mesmas dos cards.</Text>
      {LEVELS.map((l) => (
        <TouchableOpacity
          key={l.sigla}
          activeOpacity={0.8}
          style={[styles.row, { borderLeftColor: l.cor }]}
          onPress={() => navigation.navigate('Espécies')}>
          <View style={[styles.badge, { backgroundColor: l.cor }]}>
            <Text style={styles.badgeText}>{l.sigla}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{l.nome}</Text>
            <Text style={styles.count}>
              {countOf(l.sigla) === 0
                ? 'nenhuma das 5 espécies'
                : `${countOf(l.sigla)} espécie(s) neste app`}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
      <NavBar navigation={navigation} current="Conservação" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#1F1E26' },
  box: { padding: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '900' },
  sub: { color: '#A09FA9', fontSize: 14, marginTop: 4, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23222B',
    borderWidth: 1,
    borderColor: '#3B3A48',
    borderLeftWidth: 5,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  badge: {
    minWidth: 40,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  info: { flex: 1 },
  name: { color: '#fff', fontSize: 15, fontWeight: '700' },
  count: { color: '#A09FA9', fontSize: 13, marginTop: 2 },
});
