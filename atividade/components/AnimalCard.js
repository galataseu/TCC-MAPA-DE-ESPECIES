import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BIOME_COLORS, EXTINCTION_COLORS } from '../data/animals';

// Card da espécie: toque para expandir/recolher; botão abre a PÁGINA do animal.
export default function AnimalCard({ animal, expanded, onToggle, onOpen }) {
  const [imgOk, setImgOk] = useState(true);
  const color = EXTINCTION_COLORS[animal.sigla];

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onToggle}>
      <View style={[styles.card, { backgroundColor: color }]}>
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

        <View style={styles.body}>
          <Text style={styles.name}>{animal.nome}</Text>
          <Text style={styles.sci}>{animal.cientifico}</Text>
          <View style={styles.chips}>
            {animal.biomas.map((b) => (
              <View
                key={b}
                style={[styles.chip, { backgroundColor: BIOME_COLORS[b] }]}>
                <Text style={styles.chipText}>{b}</Text>
              </View>
            ))}
          </View>

          {expanded && (
            <View style={styles.details}>
              <Text style={styles.line}>
                🍽️ <Text style={styles.bold}>{animal.dieta}</Text>
              </Text>
              <Text style={styles.line}>
                ⚖️ <Text style={styles.bold}>{animal.peso}</Text>
                {'   '}📏 <Text style={styles.bold}>{animal.altura}</Text>
              </Text>
              <Text style={styles.desc}>{animal.descricao}</Text>
              {onOpen && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.openBtn}
                  onPress={onOpen}>
                  <Text style={styles.openText}>
                    Abrir página da {animal.nome} →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={styles.hint}>
            {expanded ? '▲ toque para recolher' : '▼ toque para ver mais'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, overflow: 'hidden', marginBottom: 14 },
  photo: { height: 170, backgroundColor: '#111115' },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111115',
  },
  paw: { fontSize: 56 },
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
  body: { padding: 12, alignItems: 'center' },
  name: { color: '#fff', fontWeight: '800', fontSize: 19 },
  sci: {
    color: 'rgba(255,255,255,0.85)',
    fontStyle: 'italic',
    fontSize: 13,
    marginTop: 2,
  },
  chips: { flexDirection: 'row', marginTop: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    margin: 2,
  },
  chipText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  details: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  line: { color: '#fff', fontSize: 14, marginBottom: 4 },
  bold: { fontWeight: '800' },
  desc: { color: '#E8E8EC', fontSize: 13, lineHeight: 19, marginTop: 4 },
  openBtn: {
    backgroundColor: '#FFAA44',
    borderRadius: 16,
    paddingVertical: 9,
    marginTop: 10,
    alignItems: 'center',
  },
  openText: { color: '#111', fontWeight: '800', fontSize: 13 },
  hint: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 8 },
});
