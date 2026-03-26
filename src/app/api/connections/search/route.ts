import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = session.user.id as string;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query.trim()) {
        return NextResponse.json([]);
    }

    try {
        // Get accepted connections for the current user
        const [sentConnections, receivedConnections] = await Promise.all([
            prisma.connection.findMany({
                where: { 
                    requesterId: userId,
                    status: 'ACCEPTED'
                },
                include: { 
                    receiver: { 
                        select: { id: true, username: true, name: true, email: true }
                    } 
                },
            }),
            prisma.connection.findMany({
                where: { 
                    receiverId: userId,
                    status: 'ACCEPTED'
                },
                include: { 
                    requester: { 
                        select: { id: true, username: true, name: true, email: true }
                    } 
                },
            }),
        ]);

        // Combine and format connections
        const allConnections = [
            ...sentConnections.map(c => c.receiver),
            ...receivedConnections.map(c => c.requester)
        ];

        // Filter connections based on search query (name or username)
        const filteredConnections = allConnections.filter(connection => {
            const searchTerm = query.toLowerCase();
            const name = connection.name?.toLowerCase() || '';
            const username = connection.username?.toLowerCase() || '';
            const email = connection.email?.toLowerCase() || '';
            
            return name.includes(searchTerm) || 
                   username.includes(searchTerm) || 
                   email.includes(searchTerm);
        });

        // Sort by relevance: exact matches first, then partial matches
        const sortedConnections = filteredConnections.sort((a, b) => {
            const searchTerm = query.toLowerCase();
            
            // Check for exact username matches
            const aUsernameExact = a.username?.toLowerCase() === searchTerm;
            const bUsernameExact = b.username?.toLowerCase() === searchTerm;
            if (aUsernameExact && !bUsernameExact) return -1;
            if (!aUsernameExact && bUsernameExact) return 1;
            
            // Check for exact name matches
            const aNameExact = a.name?.toLowerCase() === searchTerm;
            const bNameExact = b.name?.toLowerCase() === searchTerm;
            if (aNameExact && !bNameExact) return -1;
            if (!aNameExact && bNameExact) return 1;
            
            // Check for username starts with
            const aUsernameStart = a.username?.toLowerCase().startsWith(searchTerm);
            const bUsernameStart = b.username?.toLowerCase().startsWith(searchTerm);
            if (aUsernameStart && !bUsernameStart) return -1;
            if (!aUsernameStart && bUsernameStart) return 1;
            
            // Check for name starts with
            const aNameStart = a.name?.toLowerCase().startsWith(searchTerm);
            const bNameStart = b.name?.toLowerCase().startsWith(searchTerm);
            if (aNameStart && !bNameStart) return -1;
            if (!aNameStart && bNameStart) return 1;
            
            // Alphabetical order as fallback
            const aDisplayName = a.name || a.username || a.email || '';
            const bDisplayName = b.name || b.username || b.email || '';
            return aDisplayName.localeCompare(bDisplayName);
        });

        return NextResponse.json(sortedConnections);
    } catch (error) {
        console.error('Error searching connections:', error);
        return NextResponse.json({ error: 'Failed to search connections' }, { status: 500 });
    }
}
