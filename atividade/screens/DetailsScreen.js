import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BIOME_COLORS, EXTINCTION_COLORS } from '../data/animals';
import NavBar from '../components/NavBar';

// TELA 3 — Página do animal (uma por animal, aberta pelo card).
export default function DetailsScreen({ navigation, route }) {
  const animal = route.params?.animal;
  const [imgOk, setImgOk] = useState(true);

  if (!animal) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>
          Nenhum animal selecionado. Volte e toque em um card.
        </Text>
        <NavBar navigation={navigation} current="Detalhes" />
      </View>
    );
  }

  const color = EXTINCTION_COLORS[animal.sigla];

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.box}>
      <View style={styles.photo}>
        {imgOk ? (
          <Image
            source={{ uri: animal.imagem }}
            style={styles.img}
            onError={() => setImgOk(false)}
          />
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.paw}>🐾</Text>
          </View>
        )}
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{animal.sigla}</Text>
        </View>
      </View>

      <Text style={styles.name}>{animal.nome}</Text>
      <Text style={styles.sci}>{animal.cientifico}</Text>

      <View style={[styles.panel, { borderTopColor: color }]}>
        <Text style={styles.line}>
          🍽️ Dieta: <Text style={styles.bold}>{animal.dieta}</Text>
        </Text>
        <Text style={styles.line}>
          ⚖️ Peso: <Text style={styles.bold}>{animal.peso}</Text>
        </Text>
        <Text style={styles.line}>
          📏 Altura: <Text style={styles.bold}>{animal.altura}</Text>
        </Text>
        <View style={styles.chips}>
          {animal.biomas.map((b) => (
            <View
              key={b}
              style={[styles.chip, { backgroundColor: BIOME_COLORS[b] }]}>
              <Text style={styles.chipText}>{b}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.desc}>{animal.descricao}</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.cta}
        onPress={() => navigation.navigate('Biomas')}>
        <Text style={styles.ctaText}>Avançar: conhecer os biomas →</Text>
      </TouchableOpacity>

      <NavBar navigation={navigation} current="Detalhes" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#1F1E26' },
  box: { padding: 16, alignItems: 'center' },
  center: {
    flex: 1,
    backgroundColor: '#1F1E26',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  muted: { color: '#A09FA9', textAlign: 'center' },
  photo: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111115',
  },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111115',
  },
  paw: { fontSize: 64 },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    minWidth: 42,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  name: { color: '#fff', fontWeight: '900', fontSize: 24, marginTop: 12 },
  sci: { color: '#A09FA9', fontStyle: 'italic', fontSize: 15, marginTop: 2 },
  panel: {
    width: '100%',
    backgroundColor: '#23222B',
    borderTopWidth: 3,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  line: { color: '#fff', fontSize: 15, marginBottom: 6 },
  bold: { fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    margin: 2,
  },
  chipText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  desc: { color: '#E8E8EC', fontSize: 14, lineHeight: 21, textAlign: 'justify' },
  cta: {
    backgroundColor: '#9C5B1C',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 13,
    marginTop: 16,
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
