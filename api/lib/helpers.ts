// function to get the label sku based on the docId
export const getLabelSku = (docId: string): string | null => {
  const docIds = {
    117: "10000-C6330-BDAY-V1",
    118: "10000-C6330-BDAY-V2",
    119: "10000-C6330-BDAY-V3",
    120: "10000-C6330-BDAY-V4",
    121: "10000-C6330-BDAY-V5",
    122: "10000-C6330-WED-V1",
    123: "10000-C6330-WED-V2",
    124: "10000-C6330-WED-V3",
    125: "10000-C6330-WED-V4",
    126: "10000-C6330-WED-V5",
    127: "10000-C6330-CONG-V1",
    128: "10000-C6330-CONG-V2",
    129: "10000-C6330-CONG-V3",
    130: "10000-C6330-CONG-V4",
    105: "10101-C6330-XMAS-1",
    113: "10101-C6330-DAD-1",
    101: "10101-C6330-DAD-2",
    112: "10101-C6330-FDAY-1",
    99: "10101-C6330-FDAY-2",
    114: "10101-C6330-DT-PUNK",
    131: "10101-C6330-XMAS-1",
    132: "10101-C6330-XMAS-2",
    133: "10101-C6330-XMAS-3",
    134: "10101-C6330-XMAS-4",
    158: "10118-C6330-XMAS-4",
    157: "10118-C6330-XMAS-3",
    156: "10118-C6330-XMAS-2",
    155: "10118-C6330-XMAS-1",
    154: "10118-C6330-FDAY-2",
    153: "10118-C6330-FDAY-1",
    152: "10118-C6330-DAD-2",
    151: "10118-C6330-DAD-1",
    150: "10118-C6330-CONG-4",
    149: "10118-C6330-CONG-3",
    148: "10118-C6330-CONG-2",
    147: "10118-C6330-CONG-1",
    146: "10118-C6330-WED-5",
    145: "10118-C6330-WED-4",
    144: "10118-C6330-WED-3",
    143: "10118-C6330-WED-2",
    142: "10118-C6330-WED-1",
    141: "10118-C6330-BDAY-5",
    140: "10118-C6330-BDAY-4",
    139: "10118-C6330-BDAY-3",
    138: "10118-C6330-BDAY-2",
    137: "10118-C6330-BDAY-1",
    162: "10118-C6330-VDAY-2",
    161: "10118-C6330-VDAY-1",
    160: "10101-C6330-VDAY-2",
    159: "10101-C6330-VDAY-1",
    165: "10101-C6330-DAD-1",
    166: "10101-C6330-DAD-3",
    163: "10101-C6330-PUNK",
    167: "10118-C6330-DAD-1",
    168: "10118-C6330-DAD-3",
    136: "10118-C6330-HAZY",
    171: "10111-C6330-BDAY-1",
    172: "10111-C6330-BDAY-2",
    174: "10111-C6330-BDAY-3",
    173: "10111-C6330-BDAY-4",
    175: "10111-C6330-BDAY-5",
    176: "10111-C6330-WED-1",
    177: "10111-C6330-WED-2",
    178: "10111-C6330-WED-3",
    179: "10111-C6330-WED-4",
    180: "10111-C6330-WED-5",
    181: "10111-C6330-CONG-1",
    182: "10111-C6330-CONG-2",
    184: "10111-C6330-CONG-3",
    183: "10111-C6330-CONG-4",
    169: "10111-C6330-DAD-1",
    170: "10111-C6330-DAD-3",
    164: "10111-C6330-LOST",
    185: "10101-C6330-MDAY",
    186: "10118-C6330-MDAY",
    193: "10101-C6330-DAD-2",
    194: "10101-C6330-FDAY-1",
    195: "10101-C6330-FDAY-4",
    196: "10101-C6330-FDAY-5",
    192: "10118-C6330-FDAY-4",
    191: "10118-C6330-FDAY-5",
    188: "10111-C6330-DAD-2",
    187: "10111-C6330-FDAY-1",
    190: "10111-C6330-FDAY-4",
    189: "10111-C6330-FDAY-5",
    200: "10111-C6330-LOST-V2",
    199: "10118-C6330-HAZY-V2",
    //198: "10101-C6330-PUNK-V2",
    198: "PUNK-PERSONALISED-6",
    201: "10111-C6330-WHAM",
    202: "10111-C6330-XMSM",
    203: "10118-C6330-XMSM",
    204: "10101-C6330-XMSM",
    205: "10111-C6330-XMGB",
    206: "10118-C6330-XMGB",
    207: "10101-C6330-XMGB",
    208: "10111-C6330-XMTR",
    209: "10118-C6330-XMTR",
    210: "10101-C6330-XMTR",
    211: "10111-C6330-XMNL",
    212: "10118-C6330-XMNL",
    213: "10101-C6330-XMNL",
    214: "10111-C6330-XMNTL",
    215: "10118-C6330-XMNTL",
    216: "10101-C6330-XMNTL",
  };

  const docIdNumber = parseInt(docId, 10);
  return docIds[docIdNumber] || null;
};




// function to check if properties is an array of objects with a keys of name and value

export const isValidPropertyArray = (properties: any): properties is Property[] => {
  if (!Array.isArray(properties)) {
    return false;
  }

  for (const property of properties) {
    if (typeof property.name !== 'string' || typeof property.value !== 'string') {
      return false;
    }
  }

  return true;
};

type Property = {
  name: string;
  value: string;
};
