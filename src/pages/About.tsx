import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, Target, Eye, Heart, Users, Rocket, Globe, Brain,
  ArrowRight, Star, Award, Zap, Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();

  const values = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: "Innovation First",
      description: "We push the boundaries of what's possible with AI, constantly exploring new ways to make complex workflows simple."
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Developer Experience",
      description: "Every feature is designed with developers in mind, prioritizing ease of use without sacrificing power."
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Trust & Security",
      description: "We build with security-first principles, ensuring your data and workflows are always protected."
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Open Ecosystem",
      description: "We believe in interoperability and creating tools that work with your existing tech stack."
    }
  ];

  const team = [
    {
      name: "Alex Chen",
      role: "CEO & Co-founder",
      description: "Former AI researcher at Stanford. Led ML teams at Google and OpenAI.",
      image: "/api/placeholder/200/200"
    },
    {
      name: "Sarah Kim",
      role: "CTO & Co-founder", 
      description: "Full-stack engineer with 10+ years building developer tools at GitHub and Vercel.",
      image: "/api/placeholder/200/200"
    },
    {
      name: "Marcus Rodriguez",
      role: "Head of Product",
      description: "Product leader who scaled platforms at Figma and Notion to millions of users.",
      image: "/api/placeholder/200/200"
    },
    {
      name: "Dr. Emily Watson",
      role: "Head of AI Research",
      description: "PhD in Machine Learning from MIT. Published 50+ papers on LLM optimization.",
      image: "/api/placeholder/200/200"
    }
  ];

  const milestones = [
    {
      year: "2023",
      title: "Company Founded",
      description: "Started with a vision to democratize AI development"
    },
    {
      year: "2023",
      title: "Seed Funding",
      description: "Raised $5M from leading AI and dev tools investors"
    },
    {
      year: "2024",
      title: "Product Launch",
      description: "Launched beta with 1,000+ early adopters"
    },
    {
      year: "2024",
      title: "10K Users",
      description: "Reached 10,000 developers building AI workflows"
    }
  ];

  const stats = [
    { number: "10,000+", label: "Active Developers" },
    { number: "1M+", label: "Pipelines Created" },
    { number: "150+", label: "Countries" },
    { number: "99.9%", label: "Uptime" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">PulseSpark.ai</span>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/')}>
                Back to Home
              </Button>
              <Button onClick={() => navigate('/auth')} className="bg-gradient-primary">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 mb-8">
          <Heart className="w-4 h-4 mr-2" />
          Built by developers, for developers
        </Badge>

        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Making AI development
          <span className="block text-transparent bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text">
            accessible to everyone
          </span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          We believe that building with AI shouldn't require a PhD in machine learning. 
          Our mission is to democratize AI development through visual, intuitive tools.
        </p>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.number}</div>
              <div className="text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="container mx-auto px-6 py-20 bg-muted/20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-6xl mx-auto">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-primary/10 flex items-center justify-center mb-4">
                <Target className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl">Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed">
                To democratize AI development by providing visual, intuitive tools that make 
                complex AI workflows accessible to developers of all skill levels. We believe 
                the future of software is AI-native, and everyone should be able to participate 
                in building it.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-primary/10 flex items-center justify-center mb-4">
                <Eye className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl">Our Vision</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed">
                A world where building AI applications is as simple as connecting blocks. 
                Where researchers can prototype ideas in minutes, developers can deploy 
                production systems in hours, and businesses can iterate on AI solutions 
                at the speed of thought.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Values */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">Our Values</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            The principles that guide everything we build and every decision we make.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {values.map((value, index) => (
            <Card key={index} className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-primary/10 flex items-center justify-center flex-shrink-0">
                    {value.icon}
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-3">{value.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {value.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="container mx-auto px-6 py-20 bg-muted/20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">Meet the Team</h2>
          <p className="text-xl text-muted-foreground">
            The passionate individuals building the future of AI development
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {team.map((member, index) => (
            <Card key={index} className="border-border/50 bg-card/50 backdrop-blur-sm text-center">
              <CardHeader>
                <div className="w-24 h-24 rounded-full bg-gradient-primary/10 mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-12 h-12 text-primary" />
                </div>
                <CardTitle className="text-lg">{member.name}</CardTitle>
                <CardDescription className="text-primary font-medium">
                  {member.role}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {member.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">Our Journey</h2>
          <p className="text-xl text-muted-foreground">
            Key milestones in our mission to democratize AI development
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex gap-8 items-center">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-foreground">{milestone.year}</span>
                  </div>
                </div>
                <Card className="flex-1 border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-xl">{milestone.title}</CardTitle>
                    <CardDescription className="text-base">
                      {milestone.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5 backdrop-blur-sm">
          <CardContent className="p-16 text-center">
            <h2 className="text-4xl font-bold mb-6">
              Join us in building the future
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Whether you're a developer, researcher, or just curious about AI, 
              we'd love to have you as part of our community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/auth')} className="bg-gradient-primary">
                Start Building
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/support')}>
                Get in Touch
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default About;