import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

const academicPapers = [
  {
    title: "Attention Is All You Need",
    authors: ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit", "Llion Jones", "Aidan N. Gomez", "Lukasz Kaiser", "Illia Polosukhin"],
    year: 2017,
    doi: "10.48550/arXiv.1706.03762",
    abstract: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
    topics: ["deep learning", "natural language processing", "attention mechanisms", "neural networks"],
    summary: "Introduced the Transformer architecture that revolutionized NLP by using only attention mechanisms, eliminating the need for recurrent or convolutional layers.",
    keyContributions: [
      "Novel attention-only architecture",
      "Self-attention mechanism",
      "Parallelizable training",
      "State-of-the-art translation performance"
    ]
  },
  {
    title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    authors: ["Jacob Devlin", "Ming-Wei Chang", "Kenton Lee", "Kristina Toutanova"],
    year: 2018,
    doi: "10.48550/arXiv.1810.04805",
    abstract: "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations by jointly conditioning on both left and right context in all layers.",
    topics: ["natural language processing", "pre-training", "language models", "deep learning"],
    summary: "Presented BERT, a bidirectional Transformer model that achieved state-of-the-art results on eleven natural language processing tasks.",
    keyContributions: [
      "Bidirectional context modeling",
      "Masked Language Model pre-training",
      "Next Sentence Prediction task",
      "Significant performance improvements across NLP tasks"
    ]
  },
  {
    title: "Graph Neural Networks: A Review of Methods and Applications",
    authors: ["Jie Zhou", "Ganqu Cui", "Zhengyan Zhang", "Chengqi Yang", "Zhiyuan Liu", "Maosong Sun"],
    year: 2018,
    doi: "10.48550/arXiv.1812.08434",
    abstract: "Graph Neural Networks (GNNs) have recently become increasingly popular due to their ability to handle graph-structured data. This paper provides a comprehensive review of the existing graph neural network models.",
    topics: ["graph neural networks", "machine learning", "deep learning", "graph theory"],
    summary: "A comprehensive review of graph neural network architectures, their applications, and future research directions in handling graph-structured data.",
    keyContributions: [
      "Systematic categorization of GNN approaches",
      "Detailed analysis of GNN applications",
      "Identification of open research challenges",
      "Taxonomy of graph learning methods"
    ]
  },
  {
    title: "GPT-3: Language Models are Few-Shot Learners",
    authors: ["Tom B. Brown", "Benjamin Mann", "Nick Ryder", "Melanie Subbiah", "Jared Kaplan", "Prafulla Dhariwal", "Arvind Neelakantan", "Pranav Shyam", "Girish Sastry", "Amanda Askell", "Sandhini Agarwal", "Ariel Herbert-Voss", "Victoria Krueger", "Tegan Henighan", "Rewon Child", "Ramesh Aditya", "Daniel Ziegler", "Jeffrey Wu", "Clemens Winter", "Christopher Hesse", "Mark Chen", "Eric Sigler", "Mateusz Litwin", "Scott Gray", "Benjamin Chess", "Jack Clark", "Christopher Berner", "Sam McCandlish", "Alec Radford", "Ilya Sutskever", "Dario Amodei"],
    year: 2020,
    doi: "10.48550/arXiv.2005.14165",
    abstract: "Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training on a large corpus of text followed by fine-tuning on a specific task. We show that scaling up language models greatly improves task-agnostic, few-shot performance.",
    topics: ["large language models", "few-shot learning", "natural language processing", "deep learning"],
    summary: "Demonstrated that scaling language models to 175 billion parameters enables impressive few-shot learning capabilities without fine-tuning.",
    keyContributions: [
      "175 billion parameter language model",
      "In-context learning capabilities",
      "Few-shot performance without gradient updates",
      "Comprehensive evaluation across diverse tasks"
    ]
  },
  {
    title: "Deep Residual Learning for Image Recognition",
    authors: ["Kaiming He", "Xiangyu Zhang", "Shaoqing Ren", "Jian Sun"],
    year: 2015,
    doi: "10.1109/CVPR.2016.90",
    abstract: "Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously.",
    topics: ["computer vision", "deep learning", "neural networks", "image recognition"],
    summary: "Introduced residual connections that enabled training of extremely deep neural networks, winning ILSVRC 2015.",
    keyContributions: [
      "Residual mapping formulation",
      "Identity mapping for shortcut connections",
      "152-layer ResNet architecture",
      "Enabling training of very deep networks"
    ]
  },
  {
    title: "Generative Adversarial Networks",
    authors: ["Ian J. Goodfellow", "Jean Pouget-Abadie", "Mehdi Mirza", "Bing Xu", "David Warde-Farley", "Sherjil Ozair", "Aaron Courville", "Yoshua Bengio"],
    year: 2014,
    doi: "10.48550/arXiv.1406.2661",
    abstract: "We propose a new framework for estimating generative models via an adversarial process, in which we simultaneously train two models: a generative model G that captures the data distribution, and a discriminative model D that estimates the probability that a sample came from the training data rather than G.",
    topics: ["generative models", "adversarial training", "deep learning", "neural networks"],
    summary: "Introduced Generative Adversarial Networks (GANs), a framework for training generative models through adversarial competition between two neural networks.",
    keyContributions: [
      "Adversarial training framework",
      "Generator-discriminator architecture",
      "Minimax game formulation",
      "High-quality sample generation"
    ]
  },
  {
    title: "AlphaFold 2: Highly accurate protein structure prediction with deep learning",
    authors: ["John Jumper", "Richard Evans", "Alexander Pritzel", "Tim Green", "Michael Figurnov", "Olaf Ronneberger", "Kamal U. Hassan", "Trevor D. B. Jones", "Alex Sheridan", "David W. R. Barlow", "Andrew W. Senior", "Raia Hadsell"],
    year: 2021,
    doi: "10.1038/s41586-021-03819-2",
    abstract: "Proteins are essential to life, supporting practically all of its functions. Predicting a protein's 3D structure from its amino acid sequence is a long-standing challenge in biology. Here we describe AlphaFold 2, which achieves high accuracy in protein structure prediction.",
    topics: ["computational biology", "protein folding", "deep learning", "structural biology"],
    summary: "Achieved unprecedented accuracy in protein structure prediction, solving a 50-year grand challenge in computational biology.",
    keyContributions: [
      "Attention-based protein structure prediction",
      "End-to-end differentiable architecture",
      "Inter-residue distance prediction",
      "CASP14 competition breakthrough"
    ]
  },
  {
    title: "The Lottery Ticket Hypothesis: Finding Sparse, Trainable Neural Networks",
    authors: ["Jonathan Frankle", "Michael Carbin"],
    year: 2019,
    doi: "10.48550/arXiv.1803.03635",
    abstract: "We propose the lottery ticket hypothesis: dense, randomly-initialized, feed-forward networks contain subnetworks that are trained in isolation to reach test accuracy comparable to the original network.",
    topics: ["neural network pruning", "deep learning", "model compression", "optimization"],
    summary: "Demonstrated that dense neural networks contain sparse subnetworks that can be trained in isolation to achieve comparable performance.",
    keyContributions: [
      "Lottery ticket hypothesis formulation",
      "Iterative magnitude pruning",
      "Early-bird tickets discovery",
      "Implications for model efficiency"
    ]
  },
  {
    title: "Neural Architecture Search with Reinforcement Learning",
    authors: ["Barret Zoph", "Quoc V. Le"],
    year: 2017,
    doi: "10.48550/arXiv.1611.01578",
    abstract: "Designing neural network architectures is a challenging task. We use a recurrent network to generate the model descriptions of neural networks and train this RNN with reinforcement learning to maximize the expected accuracy of the generated architectures on a validation set.",
    topics: ["neural architecture search", "reinforcement learning", "autoML", "deep learning"],
    summary: "Pioneered the use of reinforcement learning for automatically discovering optimal neural network architectures.",
    keyContributions: [
      "RNN-based controller for architecture generation",
      "REINFORCE algorithm for optimization",
      "State-of-the-art CIFAR-10 and Penn Treebank results",
      "Automated architecture discovery"
    ]
  },
  {
    title: "Momentum Contrast for Unsupervised Visual Representation Learning",
    authors: ["Kaiming He", "Haoqi Fan", "Yuxin Wu", "Saining Xie", "Ross Girshick"],
    year: 2020,
    doi: "10.48550/arXiv.1911.05722",
    abstract: "We present Momentum Contrast (MoCo) for unsupervised visual representation learning. We build a dynamic dictionary with a queue and a moving-averaged encoder.",
    topics: ["self-supervised learning", "contrastive learning", "computer vision", "representation learning"],
    summary: "Introduced MoCo, a contrastive learning framework that builds large dictionaries for self-supervised visual representation learning.",
    keyContributions: [
      "Dictionary with queue mechanism",
      "Momentum-updated key encoder",
      "Large negative sampling capacity",
      "Strong transfer learning performance"
    ]
  }
]

const topics = [
  {
    name: "Graph Neural Networks",
    slug: "graph-neural-networks",
    description: "Neural network architectures designed to process graph-structured data",
    explanation: "Graph Neural Networks (GNNs) are a class of deep learning models specifically designed to work with graph-structured data. Unlike traditional neural networks that operate on Euclidean data like images or sequences, GNNs can capture complex relationships and dependencies in graph structures. They have found applications in social network analysis, molecular chemistry, recommendation systems, and knowledge graphs. GNNs operate by passing messages between nodes through graph edges, allowing them to aggregate information from local neighborhoods and learn rich node representations.",
    keyConcepts: [
      "Message passing",
      "Node embedding",
      "Graph convolution",
      "Attention mechanisms",
      "Spectral methods"
    ]
  },
  {
    name: "Natural Language Processing",
    slug: "natural-language-processing",
    description: "Computational techniques for understanding and generating human language",
    explanation: "Natural Language Processing (NLP) is a field of artificial intelligence focused on enabling computers to understand, interpret, and generate human language. Modern NLP has been revolutionized by deep learning, particularly through the development of large language models and attention mechanisms. Applications range from machine translation and sentiment analysis to question answering and text generation. Recent advances in transformer architectures have pushed the boundaries of what's possible in language understanding.",
    keyConcepts: [
      "Tokenization",
      "Attention mechanisms",
      "Language models",
      "Embeddings",
      "Sequence-to-sequence models"
    ]
  },
  {
    name: "Computer Vision",
    slug: "computer-vision",
    description: "AI techniques for analyzing and understanding visual information",
    explanation: "Computer Vision is an interdisciplinary field that enables computers to gain high-level understanding from digital images or videos. It encompasses tasks such as image classification, object detection, segmentation, and scene understanding. Deep learning, particularly convolutional neural networks, has transformed computer vision, achieving superhuman performance on many benchmarks. Recent advances include vision transformers, self-supervised learning, and generative models for image synthesis.",
    keyConcepts: [
      "Convolutional neural networks",
      "Image classification",
      "Object detection",
      "Image segmentation",
      "Vision transformers"
    ]
  },
  {
    name: "Deep Learning",
    slug: "deep-learning",
    description: "Neural network-based approaches to machine learning",
    explanation: "Deep Learning is a subfield of machine learning based on artificial neural networks with multiple layers. These models can learn hierarchical representations of data, automatically discovering features from raw inputs. Deep learning has revolutionized fields including computer vision, natural language processing, speech recognition, and game playing. Key architectures include deep feedforward networks, convolutional neural networks, recurrent neural networks, and transformers.",
    keyConcepts: [
      "Backpropagation",
      "Gradient descent",
      "Activation functions",
      "Regularization",
      "Optimization algorithms"
    ]
  },
  {
    name: "Reinforcement Learning",
    slug: "reinforcement-learning",
    description: "Learning through interaction with an environment",
    explanation: "Reinforcement Learning (RL) is a paradigm where agents learn to make decisions by interacting with an environment to maximize cumulative rewards. Unlike supervised learning, RL doesn't require labeled examples but learns through trial and error. It has achieved remarkable success in game playing (AlphaGo, Atari), robotics, and control systems. Key concepts include exploration-exploitation tradeoff, value functions, and policy gradients.",
    keyConcepts: [
      "Markov decision processes",
      "Q-learning",
      "Policy gradients",
      "Value functions",
      "Exploration strategies"
    ]
  },
  {
    name: "Generative Models",
    slug: "generative-models",
    description: "Models that can generate new data samples",
    explanation: "Generative Models are a class of machine learning models that can generate new, previously unseen data samples that resemble the training data. They learn the underlying distribution of the data and can create novel instances. Popular approaches include Generative Adversarial Networks (GANs), Variational Autoencoders (VAEs), diffusion models, and autoregressive models. These models have applications in image synthesis, text generation, drug discovery, and data augmentation.",
    keyConcepts: [
      "Likelihood estimation",
      "Latent variables",
      "Adversarial training",
      "Variational inference",
      "Diffusion processes"
    ]
  },
  {
    name: "Computational Biology",
    slug: "computational-biology",
    description: "Applying computational methods to biological problems",
    explanation: "Computational Biology applies computational and statistical techniques to analyze and interpret biological data. With the explosion of genomic and proteomic data, machine learning has become crucial for understanding complex biological systems. Applications include protein structure prediction, drug discovery, genomics analysis, and systems biology. Deep learning has recently achieved breakthrough results in protein folding (AlphaFold) and drug-target interaction prediction.",
    keyConcepts: [
      "Sequence analysis",
      "Protein structure prediction",
      "Molecular dynamics",
      "Network biology",
      "Multi-omics integration"
    ]
  },
  {
    name: "AutoML",
    slug: "automl",
    description: "Automating the process of machine learning model development",
    explanation: "Automated Machine Learning (AutoML) aims to automate the end-to-end process of applying machine learning to real-world problems. This includes data preprocessing, feature engineering, model selection, hyperparameter optimization, and neural architecture search. AutoML democratizes machine learning by enabling non-experts to build high-performing models and helps experts discover novel architectures and optimization strategies.",
    keyConcepts: [
      "Hyperparameter optimization",
      "Neural architecture search",
      "Feature engineering",
      "Model selection",
      "Meta-learning"
    ]
  },
  {
    name: "Self-Supervised Learning",
    slug: "self-supervised-learning",
    description: "Learning representations from unlabeled data",
    explanation: "Self-Supervised Learning is a paradigm where models learn representations from unlabeled data by solving pretext tasks. The model creates supervised learning signals from the data itself, reducing the need for manual labeling. This approach has been particularly successful in NLP (BERT, GPT) and computer vision (SimCLR, MoCo). Self-supervised pre-training has become the standard for achieving state-of-the-art performance across many domains.",
    keyConcepts: [
      "Pretext tasks",
      "Contrastive learning",
      "Masked modeling",
      "Pre-training and fine-tuning",
      "Representation learning"
    ]
  },
  {
    name: "Quantum Machine Learning",
    slug: "quantum-machine-learning",
    description: "Intersection of quantum computing and machine learning",
    explanation: "Quantum Machine Learning explores how quantum computing can enhance machine learning algorithms and how machine learning can advance quantum computing. By leveraging quantum phenomena like superposition and entanglement, quantum ML algorithms can potentially solve certain problems exponentially faster than classical algorithms. Applications include quantum chemistry, optimization, and quantum state classification.",
    keyConcepts: [
      "Quantum circuits",
      "Quantum entanglement",
      "Variational quantum algorithms",
      "Quantum kernels",
      "Quantum advantage"
    ]
  }
]

async function seedSeoContent() {
  console.log('🌱 Starting SEO content seeding...')

  // Seed topics
  console.log('\n📚 Seeding topics...')
  for (const topic of topics) {
    await prisma.topic.upsert({
      where: { slug: topic.slug },
      update: topic,
      create: topic
    })
    console.log(`✅ Created topic: ${topic.name}`)
  }

  // Seed papers
  console.log('\n📄 Seeding papers...')
  for (const paper of academicPapers) {
    const slug = createSlug(paper.title)
    const metaDescription = `Read a comprehensive summary of "${paper.title}" by ${paper.authors.join(', ')}. Key contributions, abstract, and related topics in ${paper.topics.join(', ')}.`

    const entryData = {
      title: paper.title,
      slug,
      metaDescription,
      authors: paper.authors,
      year: paper.year,
      doi: paper.doi,
      abstract: paper.abstract,
      topics: paper.topics,
      summary: paper.summary,
      autoKeywords: paper.topics,
      userKeywords: paper.keyContributions,
      contentType: 'PAPER' as const,
      publishDate: `${paper.year}-01-01`
    }

    await prisma.entry.upsert({
      where: { slug },
      update: entryData,
      create: entryData
    })
    console.log(`✅ Created paper: ${paper.title}`)
  }

  // Generate additional synthetic papers
  console.log('\n🔄 Generating additional synthetic papers...')
  const syntheticPapers = generateSyntheticPapers(90) // Generate 90 more papers

  for (const paper of syntheticPapers) {
    const slug = createSlug(paper.title)
    const metaDescription = `Read a comprehensive summary of "${paper.title}" by ${paper.authors.join(', ')}. Key contributions, abstract, and related topics in ${paper.topics.join(', ')}.`

    const entryData = {
      title: paper.title,
      slug,
      metaDescription,
      authors: paper.authors,
      year: paper.year,
      abstract: paper.abstract,
      topics: paper.topics,
      summary: paper.summary,
      autoKeywords: paper.topics,
      userKeywords: paper.keyContributions || [],
      contentType: 'PAPER' as const,
      publishDate: `${paper.year}-01-01`
    }

    try {
      await prisma.entry.upsert({
        where: { slug },
        update: entryData,
        create: entryData
      })
      console.log(`✅ Created synthetic paper: ${paper.title}`)
    } catch (error) {
      console.log(`⚠️  Skipping duplicate paper: ${paper.title}`)
    }
  }

  console.log('\n🎉 SEO content seeding completed!')
  console.log(`📈 Total papers: ${await prisma.entry.count()}`)
  console.log(`📂 Total topics: ${await prisma.topic.count()}`)
}

function generateSyntheticPapers(count: number) {
  const syntheticPapers = []

  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'Robert', 'Lisa', 'James', 'Mary', 'William', 'Patricia', 'Richard', 'Jennifer', 'Charles', 'Linda']
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas']

  const researchAreas = [
    { field: 'Machine Learning', topics: ['deep learning', 'neural networks', 'optimization', 'computer vision'] },
    { field: 'Quantum Computing', topics: ['quantum algorithms', 'quantum information', 'quantum error correction', 'quantum cryptography'] },
    { field: 'Bioinformatics', topics: ['genomics', 'proteomics', 'systems biology', 'computational biology'] },
    { field: 'Robotics', topics: ['reinforcement learning', 'control systems', 'computer vision', 'path planning'] },
    { field: 'Natural Language Processing', topics: ['language models', 'machine translation', 'sentiment analysis', 'question answering'] },
    { field: 'Computer Vision', topics: ['object detection', 'image segmentation', 'face recognition', '3D reconstruction'] },
    { field: 'Graph Theory', topics: ['graph algorithms', 'network analysis', 'graph neural networks', 'social networks'] },
    { field: 'Optimization', topics: ['convex optimization', 'non-convex optimization', 'stochastic optimization', 'distributed optimization'] }
  ]

  const paperTemplates = [
    'A Novel Approach to {topic} Using {method}',
    'Advances in {topic}: Theory and Applications',
    '{method} for Large-Scale {topic}',
    'Understanding {topic} Through {method}',
    'Efficient Algorithms for {topic} in {context}',
    'Deep Learning Methods for {topic}',
    'Theoretical Foundations of {topic}',
    'Practical Applications of {topic} in {field}',
    'Scalable Solutions for {topic}',
    'Breaking Barriers in {topic} with {method}'
  ]

  const methods = ['Neural Networks', 'Deep Learning', 'Reinforcement Learning', 'Graph Neural Networks', 'Transformers', 'Variational Inference', 'Monte Carlo Methods', 'Bayesian Optimization']
  const contexts = ['Distributed Systems', 'Edge Computing', 'Cloud Computing', 'Real-time Systems', 'High-Performance Computing']

  for (let i = 0; i < count; i++) {
    const area = researchAreas[Math.floor(Math.random() * researchAreas.length)]
    const template = paperTemplates[Math.floor(Math.random() * paperTemplates.length)]
    const method = methods[Math.floor(Math.random() * methods.length)]
    const context = contexts[Math.floor(Math.random() * contexts.length)]
    const topic = area.topics[Math.floor(Math.random() * area.topics.length)]

    const title = template
      .replace('{topic}', topic.charAt(0).toUpperCase() + topic.slice(1))
      .replace('{method}', method)
      .replace('{context}', context)
      .replace('{field}', area.field)

    const numAuthors = Math.floor(Math.random() * 4) + 1
    const authors = []
    for (let j = 0; j < numAuthors; j++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
      authors.push(`${firstName} ${lastName}`)
    }

    const year = 2015 + Math.floor(Math.random() * 9)
    const doi = `10.48550/arXiv.${year + Math.random() * 1000000 | 0}`

    const abstract = `This paper presents a novel approach to ${topic} using ${method}. We demonstrate significant improvements over existing methods through extensive experiments. Our approach achieves state-of-the-art performance on multiple benchmarks, showing promising results for real-world applications in ${area.field}.`

    const summary = `Proposed a ${method}-based approach for ${topic}, achieving improved performance through innovative techniques and comprehensive evaluation.`

    syntheticPapers.push({
      title,
      authors,
      year,
      doi,
      abstract,
      topics: area.topics.slice(0, 3),
      summary,
      keyContributions: [
        `Novel ${method} architecture`,
        `Comprehensive evaluation framework`,
        `State-of-the-art performance`,
        `Open-source implementation`
      ]
    })
  }

  return syntheticPapers
}

seedSeoContent()
  .catch((e) => {
    console.error('❌ Error seeding SEO content:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
