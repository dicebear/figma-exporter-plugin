import { JSONSchema7 } from 'json-schema';
import { DefinitionColors, DefinitionComponents, Export } from '../types';
import { removeEmptyValuesFromObject } from '../utils/removeEmptyValuesFromObject';
import { createTemplateString } from './createTemplateString';

export async function createExportDefinition(exportData: Export) {
  const size = (figma.getNodeById(exportData.frame.id) as FrameNode).width;
  const components: DefinitionComponents = {};
  const colors: DefinitionColors = {};
  const additionalOptions: Record<string, JSONSchema7> = {};

  for (const [componentGroupKey, componentGroupValue] of Object.entries(exportData.components)) {
    components[componentGroupKey] = {
      rotation: componentGroupValue.settings.rotation || undefined,
      probability: componentGroupValue.settings.probability || undefined,
      offset: {
        x: componentGroupValue.settings.offsetX || undefined,
        y: componentGroupValue.settings.offsetY || undefined,
      },
      values: {},
    };

    for (const [componentKey, componentValue] of Object.entries(componentGroupValue.collection)) {
      const componentNode = figma.getNodeById(componentValue.id) as ComponentNode;

      components[componentGroupKey].values[componentKey] = {
        content: await createTemplateString(exportData, componentNode),
        default: componentGroupValue.settings.defaults[componentKey] ?? false,
      };
    }
  }

  for (const [colorGroupKey, colorGroupValue] of Object.entries(exportData.colors)) {
    if (!colorGroupValue.isUsedByComponents) {
      continue;
    }

    const differentFromColor = colorGroupValue.settings.differentFromColor;
    const contrastColor = colorGroupValue.settings.contrastColor;

    colors[colorGroupKey] = {
      differentFromColor: differentFromColor && exportData.colors[differentFromColor]?.isUsedByComponents ? differentFromColor : undefined,
      contrastColor: contrastColor && exportData.colors[contrastColor]?.isUsedByComponents ? contrastColor : undefined,
      values: Object.values(colorGroupValue.collection).map((v) => v.value),
    };
  }

  if (exportData.frame.settings.backgroundColorGroupName) {
    const colorGroup = exportData.colors[exportData.frame.settings.backgroundColorGroupName];

    if (colorGroup) {
      additionalOptions['backgroundColor'] = {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^(transparent|[a-fA-F0-9]{6})$',
        },
        default: Object.values(colorGroup.collection).map((v) => v.value),
      };
    }
  }

  return JSON.stringify(
    removeEmptyValuesFromObject({
      $schema: 'https://www.dicebear.com/schemas/definition.json',
      $comment: 'This file was generated by the DiceBear Exporter for Figma. https://www.figma.com/community/plugin/1005765655729342787',
      meta: {
        license: {
          name: exportData.frame.settings.licenseName,
          url: exportData.frame.settings.licenseUrl,
          content: exportData.frame.settings.licenseContent,
        },
        creator: {
          name: exportData.frame.settings.creator,
          url: exportData.frame.settings.homepage,
        },
        source: {
          name: exportData.frame.settings.title,
          url: exportData.frame.settings.source,
        },
      },
      body: await createTemplateString(exportData, figma.getNodeById(exportData.frame.id) as FrameNode),
      attributes: {
        viewBox: `0 0 ${size} ${size}`,
        fill: 'none',
        shapeRendering: exportData.frame.settings.shapeRendering,
      },
      components,
      colors,
      additionalOptions
    }),
    undefined,
    2
  );
}
