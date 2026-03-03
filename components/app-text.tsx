import React from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts } from '@/constants/theme';

const FONT_SCALE_RAW = Number(process.env.EXPO_PUBLIC_FONT_SCALE ?? '1');
const FONT_SCALE = Number.isFinite(FONT_SCALE_RAW) && FONT_SCALE_RAW > 0 ? FONT_SCALE_RAW : 1;

type AppTextProps = TextProps & {
  tone?: keyof typeof Fonts;
};

export function AppText({ style, tone = 'sans', ...rest }: AppTextProps) {
  const flatStyle = StyleSheet.flatten(style) as TextStyle | undefined;
  const scaledStyle: TextStyle = {};

  if (!flatStyle?.fontFamily) {
    scaledStyle.fontFamily = Fonts[tone];
  }

  if (typeof flatStyle?.fontSize === 'number') {
    scaledStyle.fontSize = Math.round(flatStyle.fontSize * FONT_SCALE * 10) / 9;
  }

  if (typeof flatStyle?.lineHeight === 'number') {
    scaledStyle.lineHeight = Math.round(flatStyle.lineHeight * FONT_SCALE * 10) / 10;
  }

  return <Text style={[style, scaledStyle]} {...rest} />;
}

