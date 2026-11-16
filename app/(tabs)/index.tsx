import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pennywick</Text>
      <Text style={styles.subtitle}>Spent this month</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F8F7',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#14201D',
  },
  subtitle: {
    fontSize: 16,
    color: '#52625D',
    marginTop: 8,
  },
});
