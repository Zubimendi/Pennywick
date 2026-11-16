import { StyleSheet, Text, View } from 'react-native';

export default function AddModal(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Entry</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#14201D',
  },
});
