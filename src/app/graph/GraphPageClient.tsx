'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network, Loader2, Download, Filter, RotateCcw } from 'lucide-react';
import { useApiKey } from '@/hooks/useApiKey';
import UpgradeBanner from '@/components/UpgradeBanner';
import { useSession } from 'next-auth/react';
import { hasPaidFeature } from '@/lib/plans';
import KnowledgeGraph from '@/components/KnowledgeGraph';

export default function GraphPage() {
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<any[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [graphStats, setGraphStats] = useState({
        totalEntries: 0,
        totalKeywords: 0,
        totalTopics: 0,
        totalConnections: 0
    });
    const apiKey = useApiKey();
    const { data: session } = useSession();

    useEffect(() => {
        fetchEntries();
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'f' || event.key === 'F') {
                event.preventDefault();
                setIsFullscreen(!isFullscreen);
            }
            if (event.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    const fetchEntries = async () => {
        try {
            const response = await fetch('/api/entries');
            if (response.ok) {
                const data = await response.json();
                setEntries(data);
                calculateGraphStats(data);
            }
        } catch (error) {
            console.error('Error fetching entries:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateGraphStats = (entries: any[]) => {
        const keywordSet = new Set<string>();
        const topicSet = new Set<string>();
        let connections = 0;

        entries.forEach(entry => {
            // Count keywords
            (entry.autoKeywords || []).forEach((keyword: string) => keywordSet.add(keyword));

            // Count topics (if available)
            (entry.topics || []).forEach((topic: string) => topicSet.add(topic));
        });

        // Calculate potential connections (entries with 2+ shared keywords)
        for (let i = 0; i < entries.length; i++) {
            for (let j = i + 1; j < entries.length; j++) {
                const keywords1 = new Set(entries[i].autoKeywords || []);
                const keywords2 = new Set(entries[j].autoKeywords || []);
                const intersection = new Set(Array.from(keywords1).filter(x => keywords2.has(x)));
                if (intersection.size > 1) connections++;
            }
        }

        setGraphStats({
            totalEntries: entries.length,
            totalKeywords: keywordSet.size,
            totalTopics: topicSet.size,
            totalConnections: connections
        });
    };

    const handleResetView = () => {
        // Force re-render of the graph component
        setEntries([...entries]);
    };

    const handleExportGraph = () => {
        // Create a simple text export of the graph data
        const exportData = {
            entries: entries.map(e => ({
                title: e.title,
                keywords: e.autoKeywords,
                authors: e.authors,
                year: e.year
            })),
            statistics: graphStats,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'knowledge-graph-export.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleFilterByTopic = () => {
        // This could open a modal or filter UI - for now just reload
        fetchEntries();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Upgrade Banner for Graph Feature */}
            {!hasPaidFeature(session?.user || null, 'graph') && (
                <UpgradeBanner
                    message="The knowledge graph is a Pro feature. Upgrade to unlock visual connections between your entries."
                    ctaText="Upgrade to Pro"
                />
            )}

            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-medium tracking-tight">knowledge graph</h2>
                    <p className="text-sm text-muted-foreground">visualize connections between your entries and topics.</p>
                </div>
            </div>

            {!hasPaidFeature(session?.user || null, 'graph') ? (
                <div className="text-center py-24 rounded-lg bg-[var(--background)]">
                    <Network className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Knowledge Graph Preview</h3>
                    <p className="text-[var(--muted-foreground)] mb-4">
                        The knowledge graph shows visual connections between your entries, topics, and keywords.
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">
                        Upgrade to Pro to explore your knowledge network and discover hidden connections.
                    </p>
                    <div className="max-w-md mx-auto p-6 border rounded-lg bg-muted/20">
                        <div className="text-sm text-muted-foreground">
                            <p className="font-medium mb-2">Pro features include:</p>
                            <ul className="text-left space-y-1">
                                <li>• Interactive node-based visualization</li>
                                <li>• Topic clustering and connections</li>
                                <li>• Entry relationship mapping</li>
                                <li>• Keyword network analysis</li>
                            </ul>
                        </div>
                    </div>
                </div>
            ) : entries.length === 0 ? (
                <div className="text-center py-24 rounded-lg bg-[var(--background)]">
                    <Network className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-[var(--muted-foreground)] mb-4">no entries yet.</p>
                    <p className="text-sm text-muted-foreground">add some entries to see their connections in the knowledge graph.</p>
                </div>
            ) : (
                <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-[var(--background)]' : ''}`}>
                    <div className={`grid ${isFullscreen ? 'grid-cols-12 h-full' : 'grid-cols-1 lg:grid-cols-3'} gap-6 h-full`}>
                        <div className={isFullscreen ? 'col-span-10' : 'lg:col-span-2'}>
                            <Card className={isFullscreen ? 'h-full border-0 shadow-none bg-transparent' : ''}>
                                {!isFullscreen && (
                                    <CardHeader>
                                        <CardTitle>Knowledge Graph Visualization</CardTitle>
                                    </CardHeader>
                                )}
                                <CardContent className={isFullscreen ? 'h-full p-0' : ''}>
                                    <KnowledgeGraph
                                        entries={entries}
                                        isFullscreen={isFullscreen}
                                        onFullscreenChange={setIsFullscreen}
                                        height={isFullscreen ? window.innerHeight : 500}
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        <div className={isFullscreen ? 'col-span-2' : 'space-y-6'}>
                            {isFullscreen ? (
                                <div className="h-full overflow-y-auto space-y-4 p-4">
                                    <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] p-4">
                                        <h3 className="font-semibold mb-3">Graph Statistics</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <div className="text-xl font-bold">{graphStats.totalEntries}</div>
                                                <div className="text-xs text-muted-foreground">Total Entries</div>
                                            </div>
                                            <div>
                                                <div className="text-xl font-bold">{graphStats.totalConnections}</div>
                                                <div className="text-xs text-muted-foreground">Connections</div>
                                            </div>
                                            <div>
                                                <div className="text-xl font-bold">{graphStats.totalKeywords}</div>
                                                <div className="text-xs text-muted-foreground">Unique Keywords</div>
                                            </div>
                                            <div>
                                                <div className="text-xl font-bold">{graphStats.totalTopics}</div>
                                                <div className="text-xs text-muted-foreground">Topics</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] p-4">
                                        <h3 className="font-semibold mb-3">Graph Controls</h3>
                                        <div className="space-y-2">
                                            <Button variant="outline" className="w-full" onClick={handleResetView}>
                                                <RotateCcw className="w-4 h-4 mr-2" />
                                                Reset View
                                            </Button>
                                            <Button variant="outline" className="w-full" onClick={handleExportGraph}>
                                                <Download className="w-4 h-4 mr-2" />
                                                Export Graph
                                            </Button>
                                            <Button variant="outline" className="w-full" onClick={handleFilterByTopic}>
                                                <Filter className="w-4 h-4 mr-2" />
                                                Filter by Topic
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Graph Statistics</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="text-2xl font-bold">{graphStats.totalEntries}</div>
                                                    <div className="text-sm text-muted-foreground">Total Entries</div>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold">{graphStats.totalConnections}</div>
                                                    <div className="text-sm text-muted-foreground">Connections</div>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold">{graphStats.totalKeywords}</div>
                                                    <div className="text-sm text-muted-foreground">Unique Keywords</div>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold">{graphStats.totalTopics}</div>
                                                    <div className="text-sm text-muted-foreground">Topics</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Graph Controls</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                <Button variant="outline" className="w-full" onClick={handleResetView}>
                                                    <RotateCcw className="w-4 h-4 mr-2" />
                                                    Reset View
                                                </Button>
                                                <Button variant="outline" className="w-full" onClick={handleExportGraph}>
                                                    <Download className="w-4 h-4 mr-2" />
                                                    Export Graph
                                                </Button>
                                                <Button variant="outline" className="w-full" onClick={handleFilterByTopic}>
                                                    <Filter className="w-4 h-4 mr-2" />
                                                    Filter by Topic
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
