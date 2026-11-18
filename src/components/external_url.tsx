import { useCallback } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text } from 'react-native';

interface ExternalLinkProps {
    url: string;
    children: string;
}

export const ExternalLink = ({ url, children }: ExternalLinkProps) => {
    const handlePress = useCallback(async () => {
        // Check if the device is capable of opening the URL scheme
        const supported = await Linking.canOpenURL(url);

        if (supported) {
            // Open the link in the native browser
            await Linking.openURL(url);
        } else {
            Alert.alert(`Don't know how to open this URL: ${url}`);
        }
    }, [url]);

    return (
        <Pressable onPress={handlePress}
            style={{
                alignSelf: "flex-end", marginBottom: 20
            }}
        >
            <Text style={styles.linkText}>{children}</Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    linkText: {
        color: '#007AFF',
        textDecorationLine: 'underline',
        fontSize: 16,
        letterSpacing: 1.2
    },
});
