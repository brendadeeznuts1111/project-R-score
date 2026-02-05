// packages/odds-core/src/examples/rotation-description-demo.ts - Demonstrate enhanced rotation number descriptions

import { RotationNumberUtils } from '@odds-core/utils';

/**
 * Demonstrate the enhanced describeRotationNumber method
 */
export class RotationDescriptionDemo {

    /**
     * Example: Comprehensive rotation number descriptions
     */
    static demonstrateRotationDescriptions(): void {
        console.log('🎯 Enhanced Rotation Number Descriptions\n');

        const examples = [
            {
                rotation: 2501,
                description: 'NBA team rotation',
                gameData: { homeTeam: 'Los Angeles Lakers' }
            },
            {
                rotation: 2502,
                description: 'NBA moneyline (home)',
                gameData: { homeTeam: 'Los Angeles Lakers', awayTeam: 'Boston Celtics' }
            },
            {
                rotation: 2503,
                description: 'NBA moneyline (away)',
                gameData: { homeTeam: 'Los Angeles Lakers', awayTeam: 'Boston Celtics' }
            },
            {
                rotation: 2504,
                description: 'NBA spread (home)',
                gameData: { homeTeam: 'Los Angeles Lakers', awayTeam: 'Boston Celtics', line: -2.5 }
            },
            {
                rotation: 2505,
                description: 'NBA spread (away)',
                gameData: { homeTeam: 'Los Angeles Lakers', awayTeam: 'Boston Celtics', line: -2.5 }
            },
            {
                rotation: 2508,
                description: 'NBA total (over)',
                gameData: { homeTeam: 'Los Angeles Lakers', awayTeam: 'Boston Celtics', line: 225.5 }
            },
            {
                rotation: 2509,
                description: 'NBA total (under)',
                gameData: { homeTeam: 'Los Angeles Lakers', awayTeam: 'Boston Celtics', line: 225.5 }
            },
            {
                rotation: 25101,
                description: 'NBA player prop (points over)',
                gameData: { player: 'LeBron James', propType: 'points', line: 27.5 }
            },
            {
                rotation: 25102,
                description: 'NBA player prop (points under)',
                gameData: { player: 'LeBron James', propType: 'points', line: 27.5 }
            },
            {
                rotation: 3501,
                description: 'NFL game rotation',
                gameData: { homeTeam: 'Kansas City Chiefs', awayTeam: 'Buffalo Bills' }
            },
            {
                rotation: 3504,
                description: 'NFL spread',
                gameData: { homeTeam: 'Kansas City Chiefs', awayTeam: 'Buffalo Bills', line: -3.5 }
            },
            {
                rotation: 5501,
                description: 'Invalid rotation (too low)',
                gameData: { homeTeam: 'Invalid Team' }
            }
        ];

        console.log('📊 Rotation Number Description Examples:\n');

        examples.forEach((example, index) => {
            const description = RotationNumberUtils.describeRotationNumber(
                example.rotation,
                example.gameData
            );

            const sport = RotationNumberUtils.getSportFromRotation(example.rotation);
            const isValid = RotationNumberUtils.isValidRotationNumber(example.rotation);

            console.log(`${index + 1}. ${example.description}:`);
            console.log(`   Rotation: ${example.rotation}`);
            console.log(`   Sport: ${sport || 'Unknown'}`);
            console.log(`   Valid: ${isValid ? '✅' : '❌'}`);
            console.log(`   Description: "${description}"`);
            console.log('');
        });

        // Demonstrate string parsing
        console.log('🔍 String Format Examples:\n');

        const stringExamples = [
            'ROT_NBA_815',
            'ROT_NFL_3501',
            'ROT_MLB_1234',
            'INVALID_FORMAT',
            'ROT_nba_815', // lowercase
            'ROT_NBA_815_EXTRA' // extra parts
        ];

        stringExamples.forEach(rotationString => {
            const parsed = RotationNumberUtils.parseRotationString(rotationString);
            console.log(`"${rotationString}" ->`);
            console.log(`   Sport: ${parsed.sport || 'None'}`);
            console.log(`   Rotation ID: ${parsed.rotationId || 'None'}`);
            console.log(`   Valid: ${parsed.isValid ? '✅' : '❌'}`);
            console.log('');
        });

        // Demonstrate string formatting
        console.log('📝 String Formatting Examples:\n');

        const formatExamples = [
            { rotation: 2501, sport: 'NBA' as const },
            { rotation: 3501, sport: 'NFL' as const },
            { rotation: 1501, sport: 'MLB' as const }
        ];

        formatExamples.forEach(({ rotation, sport }) => {
            try {
                const formatted = RotationNumberUtils.formatRotationString(rotation, sport);
                console.log(`${rotation} (${sport}) -> "${formatted}"`);
            } catch (error) {
                console.log(`${rotation} (${sport}) -> Error: ${error}`);
            }
        });
    }

    /**
     * Run the demonstration
     */
    static runDemo(): void {
        console.log('🚀 Rotation Number Description Demo\n');
        console.log('='.repeat(60));

        this.demonstrateRotationDescriptions();

        console.log('\n✅ Demo completed!');
        console.log('\n🎯 Key Features:');
        console.log('   • Intelligent market type detection from rotation patterns');
        console.log('   • Context-aware descriptions with team and line information');
        console.log('   • Support for player props, game props, and live betting');
        console.log('   • String parsing and formatting utilities');
        console.log('   • Sport validation and range checking');
    }
}

export default RotationDescriptionDemo;
